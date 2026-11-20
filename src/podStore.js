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

const DOMO_USER_PAGE_SIZE = 100
let domoUserDirectoryPromise
let domoSdkPromise

const LEGACY_DEMO_EMAILS = new Set([
  'jules@pod.local',
  'maya@pod.local',
  'liam@pod.local',
  'priya@pod.local',
])

const DEMO_MEMBERS = [
  {
    name: 'Taylor Brooks',
    title: 'Operations Lead',
    email: 'taylor.brooks@pod.local',
    role: 'team-lead',
    managerEmail: '',
    initials: 'TB',
    color: '#dcebdc',
  },
  {
    name: 'Morgan Chen',
    title: 'Team Head',
    email: 'morgan.chen@pod.local',
    role: 'team-head',
    managerEmail: 'taylor.brooks@pod.local',
    initials: 'MC',
    color: '#e8e1f3',
  },
  {
    name: 'Alex Rivera',
    title: 'Operations Analyst',
    email: 'alex.rivera@pod.local',
    role: 'team-member',
    managerEmail: 'morgan.chen@pod.local',
    initials: 'AR',
    color: '#dfeaf1',
  },
  {
    name: 'Jamie Patel',
    title: 'Data Coordinator',
    email: 'jamie.patel@pod.local',
    role: 'team-member',
    managerEmail: 'morgan.chen@pod.local',
    initials: 'JP',
    color: '#f1e7d8',
  },
]

const storageKey = (collection) => `pod-demo:${collection}`
const inDomo = () => {
  if (typeof window === 'undefined') return false
  if (window.self !== window.top) return true
  if (new URLSearchParams(window.location.search).get('domoDev') === '1') {
    const port = window.location.port
    return !port || port === '5175'
  }
  return /(^|\.)domo\.com$/i.test(window.location.hostname)
}
const isLocalHost = () => {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}
let initializationPromise

async function getDomo({ allowLocalUserSearch = false } = {}) {
  if (!inDomo() && !(allowLocalUserSearch && isLocalHost())) {
    throw new Error('Connect to Domo to use the Domo API.')
  }
  domoSdkPromise ??= import('ryuu.js').then((module) => module.default)
  const domo = await domoSdkPromise
  if (!domo || (!allowLocalUserSearch && !domo.env)) {
    throw new Error('Domo API is not available.')
  }
  return domo
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

async function seedLocalDemoData() {
  const [members, tasks, dailyUpdates] = await Promise.all([
    list(COLLECTIONS.members),
    list(COLLECTIONS.tasks),
    list(COLLECTIONS.dailyUpdates),
  ])
  if (members.length || tasks.length || dailyUpdates.length) return

  for (const member of DEMO_MEMBERS) {
    await create(COLLECTIONS.members, member)
  }

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const tasksToSeed = [
    { title: 'Map the partner onboarding workflow', category: 'Operations', priority: 'High', memberEmail: 'morgan.chen@pod.local', status: 'In progress', hours: 4, assignedAt: yesterday, dueDate: today },
    { title: 'Audit monthly service metrics', category: 'Reporting', priority: 'Normal', memberEmail: 'alex.rivera@pod.local', status: 'Complete', hours: 3, assignedAt: yesterday, completedAt: today, dueDate: today },
    { title: 'Draft the customer handoff guide', category: 'Documentation', priority: 'Normal', memberEmail: 'alex.rivera@pod.local', status: 'Not started', hours: 5, assignedAt: today, dueDate: today },
    { title: 'Reconcile the weekly intake report', category: 'Reporting', priority: 'High', memberEmail: 'jamie.patel@pod.local', status: 'In progress', hours: 2, assignedAt: today, dueDate: today },
    { title: 'Review escalated requests', category: 'Support', priority: 'Low', memberEmail: 'taylor.brooks@pod.local', status: 'Not started', hours: 3, assignedAt: today, dueDate: today },
  ]
  for (const task of tasksToSeed) {
    await create(COLLECTIONS.tasks, task)
  }

  const updatesToSeed = [
    { memberEmail: 'morgan.chen@pod.local', name: 'Morgan Chen', date: today, yesterdayActivity: 'Outlined the current onboarding steps.', todayActivity: 'Validate the proposed handoff with the team.', blockers: 'Waiting for access to the partner dataset.', blockerStatus: 'Not solved' },
    { memberEmail: 'alex.rivera@pod.local', name: 'Alex Rivera', date: today, yesterdayActivity: 'Finished the monthly service metrics audit.', todayActivity: 'Draft the customer handoff guide.', blockers: '', blockerStatus: 'No blocker' },
    { memberEmail: 'jamie.patel@pod.local', name: 'Jamie Patel', date: today, yesterdayActivity: 'Cleaned up the weekly intake data.', todayActivity: 'Reconcile this week’s intake report.', blockers: '', blockerStatus: 'No blocker' },
  ]
  for (const update of updatesToSeed) {
    await create(COLLECTIONS.dailyUpdates, update)
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
    } else {
      const Domo = await getDomo()
      await Domo.appdb.update(COLLECTIONS.admins, configuredAdmin.id, { ...configuredAdmin, ...ADMIN_SEED })
    }
  } else {
    await create(COLLECTIONS.admins, ADMIN_SEED)
  }

  if (!inDomo()) {
    await seedLocalDemoData()
    if (!await authenticateCurrentUser()) {
      localStorage.setItem('pod-demo:session', JSON.stringify({ email: ADMIN_SEED.email }))
    }
  }
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

export async function listDemoUsers() {
  if (inDomo()) return []
  const [admins, members] = await Promise.all([
    list(COLLECTIONS.admins),
    list(COLLECTIONS.members),
  ])
  return [...admins, ...members].map(({ email, name, title, role, color }) => ({
    email,
    name,
    title,
    role,
    color,
  }))
}

export function canSearchDomoUsers() {
  return inDomo() || isLocalHost()
}

async function loadDomoUserDirectory() {
  if (!canSearchDomoUsers()) {
    throw new Error('Connect to Domo to search the company user directory.')
  }
  if (!domoUserDirectoryPromise) {
    domoUserDirectoryPromise = (async () => {
      const domo = await getDomo({ allowLocalUserSearch: true })
      if (typeof domo.get !== 'function') {
        throw new Error('The authenticated Domo user directory API is unavailable.')
      }
      if (typeof window.domoApi?.getUsers === 'function') {
        return window.domoApi.getUsers(domo, DOMO_USER_PAGE_SIZE)
      }
      const users = []
      let offset = 0
      while (true) {
        const page = await domo.get(
          `/domo/users/v1?includeDetails=true&limit=${DOMO_USER_PAGE_SIZE}&offset=${offset}`,
        )
        if (!Array.isArray(page)) {
          throw new Error('Domo returned an invalid user directory response.')
        }
        users.push(...page)
        if (page.length < DOMO_USER_PAGE_SIZE) return users
        offset += page.length
      }
    })().catch((failure) => {
      domoUserDirectoryPromise = undefined
      throw failure
    })
  }
  return domoUserDirectoryPromise
}

export async function searchDomoUsers(query) {
  const searchTerm = query.trim().toLocaleLowerCase()
  if (!searchTerm) return []

  const users = await loadDomoUserDirectory()
  return users
    .map((user) => {
      const email = String(user.detail?.email || user.email || '').trim().toLowerCase()
      const name = String(user.displayName || user.name || '').trim()
      return {
        email,
        name: name || email,
        title: String(user.detail?.title || user.title || '').trim(),
      }
    })
    .filter(({ email, name }) =>
      email && `${name} ${email}`.toLocaleLowerCase().includes(searchTerm),
    )
    .sort((first, second) => first.name.localeCompare(second.name))
}

export async function switchDemoUser(email) {
  if (inDomo()) throw new Error('Demo accounts are only available outside Domo.')
  const user = (await listDemoUsers()).find((candidate) => emailKey(candidate.email) === emailKey(email))
  if (!user) throw new Error('That demo account does not exist.')
  localStorage.setItem('pod-demo:session', JSON.stringify({ email: user.email }))
  return user
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
  const managerAdmin = admins.find((admin) => emailKey(admin.email) === emailKey(normalized.managerEmail))
  validateHierarchy(normalized, members, managerAdmin)
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
  const admins = await list(COLLECTIONS.admins)
  if (nextEmail !== emailKey(member.email)) {
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
    const managerAdmin = admins.find((admin) => emailKey(admin.email) === emailKey(nextMember.managerEmail))
    validateHierarchy(nextMember, documents, managerAdmin)
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
