(function attachDomoApi(globalScope) {
    var api = {
        getDomo: async function getDomo() {
            if (!globalScope.domo) {
                throw new Error('Domo API is not available.');
            }
            return globalScope.domo;
        },
        waitForUser: async function waitForUser(getDomo) {
            var deadline = Date.now() + 10000;
            var domoInstance;
            while (Date.now() < deadline) {
                try {
                    domoInstance = await getDomo();
                    var email = domoInstance.env && domoInstance.env.userEmail;
                    if (email && email.trim()) return email.trim().toLowerCase();
                } catch {
                    // The Domo runtime is loaded by the platform before this helper runs.
                }
                await new Promise(function resolveTimer(resolve) {
                    globalScope.setTimeout(resolve, 100);
                });
            }
            try {
                domoInstance = await getDomo();
                return domoInstance.env && domoInstance.env.userEmail
                    ? domoInstance.env.userEmail.trim().toLowerCase()
                    : '';
            } catch {
                return '';
            }
        },
        getUsers: async function getUsers(domoInstance, pageSize) {
            var domo = domoInstance || await api.getDomo();
            var limit = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 100;
            if (typeof domo.get !== 'function') {
                throw new Error('The authenticated Domo user directory API is unavailable.');
            }

            var users = [];
            var offset = 0;
            while (true) {
                var page = await domo.get(
                    '/domo/users/v1?includeDetails=true&limit=' + limit + '&offset=' + offset
                );
                if (!Array.isArray(page)) {
                    throw new Error('Domo returned an invalid user directory response.');
                }
                users.push.apply(users, page);
                if (page.length < limit) return users;
                offset += page.length;
            }
        },
    };

    globalScope.domoApi = api;
})(window);
