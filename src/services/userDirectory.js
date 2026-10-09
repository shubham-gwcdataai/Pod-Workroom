import Domo from 'ryuu.js';
import { authenticateCurrentUser, isDomoRuntime } from '../podStore';
import { emailKey } from '../utils/hierarchy.js';

export function normalizeDomoUser(user) {
    user = user?.user ?? user?.data ?? user ?? {};
    const detail = user.detail ?? {};
    return {
        id: user.id ?? user.userId,
        name: (user.displayName || user.name || user.userName || '').trim(),
        email: emailKey(user.email || detail.email || user.emailAddress || user.userEmail),
        title: (user.title || user.jobTitle || detail.title || '').trim(),
    };
}

function userList(response) {
    const users = Array.isArray(response) ? response : response?.users ?? response?.data;
    if (!Array.isArray(users)) throw new Error('Domo returned an unexpected user list. Enter the person’s details manually.');
    return users;
}

function directoryError(error) {
    if (error?.status === 403 || error?.status === 401) return new Error('Domo denied access to the user directory. Enter details manually or ask your Domo administrator to check user API access.', { cause: error });
    return new Error('Could not load the Domo user directory. Try again or enter details manually.', { cause: error });
}

export function createUserDirectory({ get, authorize, available }) {
    let cache;
    async function actor() {
        const user = await authorize();
        if (user?.role !== 'admin') throw new Error('Only administrators can look up people to add to the POD.');
        if (!available()) throw new Error('Domo user search is available in the published app or connected Domo development preview. You can enter details manually here.');
        return emailKey(user.email);
    }
    async function load() {
        const email = await actor();
        if (!cache || cache.email !== email || Date.now() - cache.at > 300000) {
            const entry = { email, at: Date.now() };
            entry.promise = (async () => {
                const people = new Map();
                const limit = 100;
                for (let offset = 0; ; offset += limit) {
                    const users = userList(await get(`/domo/users/v1?includeDetails=true&limit=${limit}&offset=${offset}`));
                    let added = 0;
                    for (const user of users) {
                        const person = normalizeDomoUser(user);
                        const key = person.id != null ? String(person.id) : person.email;
                        if (key && !people.has(key)) { people.set(key, person); added++; }
                    }
                    if (users.length < limit) return [...people.values()];
                    if (!added) throw new Error('The Domo user list did not advance to the next page.');
                }
            })().catch((error) => { if (cache === entry) cache = undefined; throw directoryError(error); });
            cache = entry;
        }
        return cache.promise;
    }
    return {
        async search(query) {
            if (query.trim().length < 2) return [];
            const users = await load();
            const terms = query.trim().toLowerCase().split(/\s+/);
            return users.filter((person) => terms.every((term) => `${person.name} ${person.email}`.toLowerCase().includes(term)))
                .sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email));
        },
        async details(person) {
            await actor();
            if (person.email && person.name) return person;
            if (person.id == null) throw new Error('Domo did not return an email for this person. Enter their company email manually.');
            let details;
            try { details = normalizeDomoUser(await get(`/domo/users/v1/${encodeURIComponent(person.id)}?includeDetails=true`)); }
            catch (error) { throw directoryError(error); }
            const result = { ...person, ...details, name: details.name || person.name, title: details.title || person.title };
            if (!result.email) throw new Error('Domo did not return an email for this person. Enter their company email manually.');
            return result;
        },
    };
}

export const userDirectory = createUserDirectory({ get: (url) => Domo.get(url), authorize: authenticateCurrentUser, available: isDomoRuntime });
