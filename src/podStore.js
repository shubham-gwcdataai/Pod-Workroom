import Domo from 'ryuu.js';
import { emailKey, parentRole, scopeWorkspace, validateHierarchy } from './utils/hierarchy.js';

const COLLECTIONS = {
  admins: 'Admin_Login',
  members: 'POD_Members',
  tasks: 'POD_WorkItems',
  dailyUpdates: 'POD_DailyUpdates',
}

const ADMIN_SEED = {
  email: import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase() || 'admin@pod.local',
  name: import.meta.env.VITE_ADMIN_NAME?.trim() || 'POD Administrator',
  title: import.meta.env.VITE_ADMIN_TITLE?.trim() || 'Administrator',
  role: 'admin',
}

const LEGACY_DEMO_EMAILS = new Set([
  'jules@pod.local',
  'maya@pod.local',
  'liam@pod.local',
  'priya@pod.local',
])

const storageKey = (collection) => `pod-demo:${collection}`
const inDomo = () => {
  if (typeof window === 'undefined') return false
  if (window.self !== window.top) return true
  if (new URLSearchParams(window.location.search).get('domoDev') === '1') return true
  return /(^|\.)domo\.com$/i.test(window.location.hostname)
}
let initializationPromise

function getDomo() {
  if (!Domo.env || !Domo.appdb) throw new Error('Domo API is not available.')
  return Promise.resolve(Domo)
}

function normalizeDocuments(response) {
  const documents = Array.isArray(response) ? response : response?.documents ?? response?.data ?? []
  return documents.map((document) => ({ ...document.content, id: document.id ?? document._id }))
}

function readLocal(collection) {
  return JSON.parse(localStorage.getItem(storageKey(collection)) || '[]')
}

function writeLocal(collection, documents) {
  localStorage.setItem(storageKey(collection), JSON.stringify(documents))
}

async function list(collection) {
  if (!inDomo()) return readLocal(collection)
  const Domo = await getDomo()
  return normalizeDocuments(await Domo.appdb.list(collection))
}

async function create(collection, document) {
  if (!inDomo()) {
    const documents = readLocal(collection)
    const created = { ...document, id: crypto.randomUUID() }
    writeLocal(collection, [...documents, created])
    return created
  }
  const Domo = await getDomo()
  const created = await Domo.appdb.create(collection, document)
  return { ...created.content, id: created.id ?? created._id }
}

async function removeDemoRows(collection, predicate) {
  const documents = await list(collection)
  const demoRows = documents.filter(predicate)
  if (demoRows.length === 0) return

  if (!inDomo()) {
    writeLocal(collection, documents.filter((document) => !predicate(document)))
    return
  }

  const Domo = await getDomo()
  await Promise.all(demoRows.map((document) => Domo.appdb.remove(collection, document.id)))
}

async function cleanLegacyDemoData() {
  await Promise.all([
    removeDemoRows(COLLECTIONS.members, (member) => LEGACY_DEMO_EMAILS.has(member.email?.toLowerCase())),
    removeDemoRows(COLLECTIONS.tasks, (task) => LEGACY_DEMO_EMAILS.has(task.memberEmail?.toLowerCase())),
    removeDemoRows(COLLECTIONS.dailyUpdates, (update) => LEGACY_DEMO_EMAILS.has(update.memberEmail?.toLowerCase())),
  ])

  const session = localStorage.getItem('pod-demo:session')
  if (session) {
    try {
      if (LEGACY_DEMO_EMAILS.has(JSON.parse(session).email?.toLowerCase())) {
        localStorage.removeItem('pod-demo:session')
      }
    } catch {
      localStorage.removeItem('pod-demo:session')
    }
  }
}

async function seedStore() {
  await cleanLegacyDemoData()
  const admins = await list(COLLECTIONS.admins)
  const configuredAdmin = admins.find(
    (admin) => admin.email?.toLowerCase() === ADMIN_SEED.email,
  )

  if (configuredAdmin) {
    if (!inDomo()) {
      const updated = { ...configuredAdmin, ...ADMIN_SEED }
      writeLocal(COLLECTIONS.admins, admins.map((admin) => admin.id === configuredAdmin.id ? updated : admin))
      return
    }

    const Domo = await getDomo()
    await Domo.appdb.update(COLLECTIONS.admins, configuredAdmin.id, { ...configuredAdmin, ...ADMIN_SEED })
    return
  }

  await create(COLLECTIONS.admins, ADMIN_SEED)
}

export function initializeStore() {
  initializationPromise ??= seedStore()
  return initializationPromise
}

export async function authenticateCurrentUser() {
  if (!inDomo()) {
    try {
      const savedUser = JSON.parse(localStorage.getItem('pod-demo:session'))
      if (savedUser?.email) {
        const admins = await list(COLLECTIONS.admins)
        const members = await list(COLLECTIONS.members)
        return admins.find((admin) => emailKey(admin.email) === emailKey(savedUser.email)) ||
          members.find((member) => emailKey(member.email) === emailKey(savedUser.email)) || null
      }
    } catch {
      localStorage.removeItem('pod-demo:session')
    }
    return null
  }

  const domo = await getDomo()
  const authenticatedEmail = domo.env?.userEmail?.trim().toLowerCase() || ''
  if (!authenticatedEmail) return null

  const [admins, members] = await Promise.all([
    list(COLLECTIONS.admins),
    list(COLLECTIONS.members),
  ])
  const admin = admins.find((candidate) => candidate.email?.toLowerCase() === authenticatedEmail)
  if (admin || authenticatedEmail === ADMIN_SEED.email) {
    return {
      ...(admin || {}),
      email: authenticatedEmail,
      name: domo.env.userName || admin?.name || ADMIN_SEED.name,
      title: admin?.title || ADMIN_SEED.title,
      role: 'admin',
    }
  }

  const member = members.find((candidate) => candidate.email?.toLowerCase() === authenticatedEmail)
  if (!member) return null
  return {
    ...member,
    name: member.name || domo.env.userName,
    role: member.role || 'team-member',
  }
}

export async function loadWorkspace() {
  const [members, tasks, dailyUpdates] = await Promise.all([
    list(COLLECTIONS.members),
    list(COLLECTIONS.tasks),
    list(COLLECTIONS.dailyUpdates),
  ])
  return scopeWorkspace({
    members: members.map((member) => Object.fromEntries(Object.entries(member).filter(([key]) => key !== 'passwordHash'))),
    tasks,
    dailyUpdates: dailyUpdates.sort((first, second) => `${second.date}${second.id}`.localeCompare(`${first.date}${first.id}`)),
  }, await authenticateCurrentUser())
}

async function requireAdmin() {
  const user = await authenticateCurrentUser()
  if (user?.role !== 'admin') throw new Error('Only administrators can manage people and assignments.')
}

export async function updateTask(taskId, changes) {
  const user = await authenticateCurrentUser()
  const existing = (await list(COLLECTIONS.tasks)).find((task) => task.id === taskId)
  if (!user || !existing || (user.role !== 'admin' && emailKey(existing.memberEmail) !== emailKey(user.email))) {
    throw new Error('You can only update your own work items.')
  }
  if (!inDomo()) {
    writeLocal(COLLECTIONS.tasks, readLocal(COLLECTIONS.tasks).map((task) => task.id === taskId ? { ...task, ...changes } : task))
    return
  }
  const Domo = await getDomo()
  const task = (await list(COLLECTIONS.tasks)).find((item) => item.id === taskId)
  if (!task) throw new Error('That work item no longer exists.')
  await Domo.appdb.update(COLLECTIONS.tasks, taskId, { ...task, ...changes })
}

export async function createMember(member) {
  await requireAdmin()
  const normalizedEmail = member.email.trim().toLowerCase()
  const members = await list(COLLECTIONS.members)
  const admins = await list(COLLECTIONS.admins)
  if (admins.some((admin) => emailKey(admin.email) === normalizedEmail)) {
    throw new Error('This email belongs to an administrator. Use a different work email.')
  }
  if (members.some((candidate) => candidate.email?.toLowerCase() === normalizedEmail)) {
    throw new Error('A POD member with this email already exists.')
  }

  const normalized = {
    ...member,
    email: normalizedEmail,
    role: member.role || 'team-member',
    managerEmail: member.role === 'team-lead' ? '' : emailKey(member.managerEmail),
    initials: member.initials || member.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    color: member.color || '#e3ebe5',
  }
  validateHierarchy(normalized, members)
  return create(COLLECTIONS.members, normalized)
}

export async function updateMember(email, changes) {
  await requireAdmin()
  const documents = await list(COLLECTIONS.members)
  const member = documents.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())
  if (!member) throw new Error('That POD member no longer exists.')

  const role = changes.role || member.role
  const nextEmail = emailKey(changes.email ?? member.email)
  const name = (changes.name ?? member.name).trim()
  const title = (changes.title ?? member.title ?? '').trim()
  if (!name) throw new Error('Enter a full name.')
  if (!/^[^\s@]+@[^\s@]+$/.test(nextEmail)) throw new Error('Enter a valid work email.')
  if (documents.some((candidate) => candidate.id !== member.id && emailKey(candidate.email) === nextEmail)) {
    throw new Error('A POD member with this email already exists.')
  }
  if (nextEmail !== emailKey(member.email)) {
    const admins = await list(COLLECTIONS.admins)
    if (admins.some((admin) => emailKey(admin.email) === nextEmail)) {
      throw new Error('This email belongs to an administrator. Use a different work email.')
    }
  }
  const normalizedChanges = {
    name,
    title,
    email: nextEmail,
    initials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    role,
    managerEmail: role === 'team-lead'
      ? ''
      : emailKey(changes.managerEmail ?? member.managerEmail),
  }
  const nextMember = { ...member, ...normalizedChanges }
  if (role !== member.role || normalizedChanges.managerEmail !== emailKey(member.managerEmail)) {
    validateHierarchy(nextMember, documents)
  }
  if (role !== member.role && documents.some((candidate) => emailKey(candidate.managerEmail) === emailKey(email) &&
      parentRole[candidate.role] !== nextMember.role)) {
    throw new Error('Reassign this person’s direct reports before changing their role.')
  }

  const emailChanged = nextEmail !== emailKey(member.email)
  const relatedWrites = []
  if (emailChanged) {
    for (const report of documents.filter((candidate) => emailKey(candidate.managerEmail) === emailKey(member.email))) {
      relatedWrites.push({ collection: COLLECTIONS.members, original: report, updated: { ...report, managerEmail: nextEmail } })
    }
    for (const collection of [COLLECTIONS.tasks, COLLECTIONS.dailyUpdates]) {
      for (const record of (await list(collection)).filter((item) => emailKey(item.memberEmail) === emailKey(member.email))) {
        relatedWrites.push({ collection, original: record, updated: { ...record, memberEmail: nextEmail } })
      }
    }
  }

  if (!inDomo()) {
    for (const write of relatedWrites) {
      writeLocal(write.collection, readLocal(write.collection).map((record) => record.id === write.original.id ? write.updated : record))
    }
    writeLocal(COLLECTIONS.members, readLocal(COLLECTIONS.members).map((candidate) => candidate.id === member.id ? nextMember : candidate))
    return nextMember
  }

  const Domo = await getDomo()
  const completedWrites = []
  try {
    for (const write of relatedWrites) {
      await Domo.appdb.update(write.collection, write.original.id, write.updated)
      completedWrites.push(write)
    }
    const updated = await Domo.appdb.update(COLLECTIONS.members, member.id, nextMember)
    return { ...updated.content, id: updated.id ?? updated._id }
  } catch (failure) {
    const recovery = await Promise.allSettled(completedWrites.map((write) => Domo.appdb.update(write.collection, write.original.id, write.original)))
    if (recovery.some((result) => result.status === 'rejected')) {
      throw new Error('The email update was interrupted and some linked records could not be restored. Check the reporting links and work history before retrying.', { cause: failure })
    }
    throw failure
  }
}

export async function createTask(task) {
  await requireAdmin()
  return create(COLLECTIONS.tasks, task)
}

export async function deleteMember(email) {
  await requireAdmin()
  const documents = await list(COLLECTIONS.members)
  const member = documents.find((candidate) => emailKey(candidate.email) === emailKey(email))
  if (!member) throw new Error('That POD member no longer exists.')
  const reports = documents.filter((candidate) => emailKey(candidate.managerEmail) === emailKey(email))
  if (!inDomo()) {
    writeLocal(COLLECTIONS.members, documents.filter((candidate) => candidate.id !== member.id)
      .map((candidate) => reports.includes(candidate) ? { ...candidate, managerEmail: '' } : candidate))
    return
  }
  const domo = await getDomo()
  for (const report of reports) {
    await domo.appdb.update(COLLECTIONS.members, report.id, { ...report, managerEmail: '' })
  }
  await domo.appdb.remove(COLLECTIONS.members, member.id)
}

export async function saveDailyUpdate(update) {
  const user = await authenticateCurrentUser()
  if (!user || (user.role !== 'admin' && emailKey(update.memberEmail) !== emailKey(user.email))) {
    throw new Error('You can only submit your own daily update.')
  }
  const existing = (await list(COLLECTIONS.dailyUpdates)).find((item) => item.memberEmail === update.memberEmail && item.date === update.date)
  if (!existing) return create(COLLECTIONS.dailyUpdates, update)

  if (!inDomo()) {
    writeLocal(COLLECTIONS.dailyUpdates, readLocal(COLLECTIONS.dailyUpdates).map((item) => item.id === existing.id ? { ...item, ...update } : item))
    return
  }

  const Domo = await getDomo()
  await Domo.appdb.update(COLLECTIONS.dailyUpdates, existing.id, { ...existing, ...update })
}

export const isDomoRuntime = inDomo

export const adminConfig = {
  email: ADMIN_SEED.email,
  name: ADMIN_SEED.name,
  title: ADMIN_SEED.title,
}
