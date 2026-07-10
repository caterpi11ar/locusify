#!/usr/bin/env node

import process from 'node:process'
import { Vercel } from '@vercel/sdk'

const APPS = [
  {
    key: 'app',
    projectIdEnv: 'VERCEL_PROJECT_ID_APP',
    rootDirectory: 'apps/app',
    framework: 'vite',
  },
  {
    key: 'backend',
    projectIdEnv: 'VERCEL_PROJECT_ID_BACKEND',
    rootDirectory: 'apps/backend',
    framework: 'nextjs',
  },
  {
    key: 'web',
    projectIdEnv: 'VERCEL_PROJECT_ID_WEB',
    rootDirectory: 'apps/web',
    framework: 'nextjs',
  },
]

const COMMANDS = new Set(['check', 'status', 'list'])

function requireToken() {
  const token = process.env.VERCEL_TOKEN?.trim()

  if (!token) {
    throw new Error('Missing required environment variable: VERCEL_TOKEN')
  }

  return token
}

function sdkRequest() {
  const request = {}
  const teamId = process.env.VERCEL_TEAM_ID?.trim()

  if (teamId) {
    request.teamId = teamId
  }

  return request
}

function projectIdFor(app) {
  return process.env[app.projectIdEnv]?.trim()
}

function formatDate(value) {
  if (!value) {
    return ''
  }

  const timestamp = typeof value === 'number' ? value : Number(value)

  if (Number.isNaN(timestamp)) {
    return String(value)
  }

  return new Date(timestamp).toISOString()
}

function valueAt(object, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((current, key) => current?.[key], object)

    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

function sdkErrorMessage(error) {
  return error?.body?.message
    ?? error?.rawResponse?.statusText
    ?? error?.message
    ?? String(error)
}

function projectRows(projects) {
  return projects.map(({ app, projectId, project, status, error }) => ({
    app: app.key,
    projectId: projectId ?? '',
    status,
    project: project?.name ?? '',
    framework: project?.framework ?? '',
    rootDirectory: project?.rootDirectory ?? '',
    repo: valueAt(project, ['link.repo', 'link.org', 'link.repoId']) ?? '',
    error: error ?? '',
  }))
}

function deploymentRows(deployments) {
  return deployments.map(({ app, project, projectId, deployment, status, error }) => {
    const meta = deployment?.meta ?? {}

    return {
      app: app.key,
      project: project?.name ?? projectId ?? '',
      status,
      state: deployment?.state ?? deployment?.readyState ?? '',
      target: deployment?.target ?? '',
      url: deployment?.url ?? '',
      createdAt: formatDate(deployment?.createdAt ?? deployment?.created),
      commit: meta.githubCommitSha ?? meta.gitCommitSha ?? meta.githubCommitRef ?? '',
      author: meta.githubCommitAuthorName ?? meta.gitCommitAuthorName ?? '',
      error: error ?? '',
    }
  })
}

function printRows(rows) {
  console.table(rows)
}

async function listProjects(vercel, apps) {
  const projectRefs = new Set(
    apps
      .map(app => projectIdFor(app))
      .filter(Boolean),
  )

  if (projectRefs.size === 0) {
    return []
  }

  const response = await vercel.projects.getProjects({
    ...sdkRequest(),
    limit: '100',
  })

  const projects = response.projects ?? []

  return projects.filter(project => projectRefs.has(project.id) || projectRefs.has(project.name))
}

function mapProjectsById(projects) {
  return new Map(projects.flatMap(project => [[project.id, project], [project.name, project]]))
}

async function getProjectLookup(vercel, apps) {
  try {
    const projects = await listProjects(vercel, apps)

    return {
      projectsById: mapProjectsById(projects),
      error: undefined,
    }
  }
  catch (error) {
    return {
      projectsById: new Map(),
      error: sdkErrorMessage(error),
    }
  }
}

function compareField(project, field, expected) {
  if (!(field in project)) {
    return 'unsupported'
  }

  return project[field] === expected ? 'ok' : `mismatch(expected:${expected}, actual:${project[field] ?? 'empty'})`
}

async function runList(vercel) {
  const appsWithIds = APPS.filter(app => projectIdFor(app))
  const { projectsById, error } = await getProjectLookup(vercel, appsWithIds)

  const results = APPS.map((app) => {
    const projectId = projectIdFor(app)

    if (!projectId) {
      return { app, projectId, status: 'missing_project_id' }
    }

    if (error) {
      return { app, projectId, status: 'error', error }
    }

    const project = projectsById.get(projectId)

    if (!project) {
      return { app, projectId, status: 'not_found' }
    }

    return { app, projectId, project, status: 'ok' }
  })

  printRows(projectRows(results))

  return results.some(result => ['error', 'not_found'].includes(result.status)) ? 1 : 0
}

async function runCheck(vercel) {
  const appsWithIds = APPS.filter(app => projectIdFor(app))
  const { projectsById, error } = await getProjectLookup(vercel, appsWithIds)

  const results = APPS.map((app) => {
    const projectId = projectIdFor(app)

    if (!projectId) {
      return { app, projectId, status: 'missing_project_id' }
    }

    if (error) {
      return { app, projectId, status: 'error', error }
    }

    const project = projectsById.get(projectId)

    if (!project) {
      return { app, projectId, status: 'not_found' }
    }

    const rootStatus = compareField(project, 'rootDirectory', app.rootDirectory)
    const frameworkStatus = compareField(project, 'framework', app.framework)
    const status = [rootStatus, frameworkStatus].every(result => result === 'ok' || result === 'unsupported')
      ? 'ok'
      : 'mismatch'

    return {
      app,
      projectId,
      project,
      status,
      error: `root:${rootStatus} framework:${frameworkStatus}`,
    }
  })

  printRows(projectRows(results))

  return results.some(result => ['error', 'not_found', 'mismatch'].includes(result.status)) ? 1 : 0
}

async function runStatus(vercel) {
  const appsWithIds = APPS.filter(app => projectIdFor(app))
  const { projectsById } = await getProjectLookup(vercel, appsWithIds)
  const results = []

  for (const app of APPS) {
    const projectId = projectIdFor(app)

    if (!projectId) {
      results.push({ app, projectId, status: 'missing_project_id' })
      continue
    }

    try {
      const response = await vercel.deployments.getDeployments({
        ...sdkRequest(),
        projectId,
        limit: 1,
      })
      const deployment = response.deployments?.[0]

      results.push({
        app,
        projectId,
        project: projectsById.get(projectId),
        deployment,
        status: deployment ? 'ok' : 'no_deployments',
      })
    }
    catch (error) {
      results.push({
        app,
        projectId,
        project: projectsById.get(projectId),
        status: 'error',
        error: sdkErrorMessage(error),
      })
    }
  }

  printRows(deploymentRows(results))

  return results.some(result => result.status === 'error') ? 1 : 0
}

async function main() {
  const command = process.argv[2]

  if (!COMMANDS.has(command)) {
    console.error('Usage: pnpm vercel:<check|status|list>')
    process.exit(1)
  }

  try {
    const vercel = new Vercel({
      bearerToken: requireToken(),
    })

    if (command === 'list') {
      process.exitCode = await runList(vercel)
      return
    }

    if (command === 'check') {
      process.exitCode = await runCheck(vercel)
      return
    }

    process.exitCode = await runStatus(vercel)
  }
  catch (error) {
    console.error(sdkErrorMessage(error))
    process.exit(1)
  }
}

await main()
