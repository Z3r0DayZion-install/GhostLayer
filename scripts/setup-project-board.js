#!/usr/bin/env node
/**
 * GhostLayer MVP — GitHub Projects v2 board setup
 *
 * Creates:
 *   - Project "GhostLayer MVP"
 *   - Fields: Status (single-select), Priority, Epic, Type
 *   - Adds all 29 issues
 *   - Sets Status per the Now / Next / Backlog split
 *
 * Usage: node scripts/setup-project-board.js
 * Requires: gh CLI authenticated with project scope
 */

'use strict'

const { execSync } = require('child_process')
const os   = require('os')
const fs   = require('fs')
const path = require('path')

// ── Config ────────────────────────────────────────────────────────────────────
const OWNER      = 'Z3r0DayZion-install'
const REPO       = 'GhostLayer'
const TOTAL_ISSUES = 29

// Blunt recommendation from spec:
// NOW  = first 3 issues in each phase-1 epic (GL-101, GL-201, GL-301)
// NEXT = supporting data issues (GL-202, GL-203, GL-302)
// Everything else → Backlog
const STATUS_MAP = {
  1: 'Now',   // GL-101 — Create default workspace on app start
  4: 'Now',   // GL-201 — Drag/drop file into GhostLayer
  7: 'Now',   // GL-301 — Render staged file list

  5: 'Next',  // GL-202 — Store file contents in memfs only
  6: 'Next',  // GL-203 — Add staged file manifest entry
  8: 'Next',  // GL-302 — Truthful file-state labels
}

// ── GraphQL helper ─────────────────────────────────────────────────────────────
function gql(query) {
  const tmpFile = path.join(os.tmpdir(), `gl_gql_${Date.now()}_${Math.random().toString(36).slice(2)}.json`)
  fs.writeFileSync(tmpFile, JSON.stringify({ query }), 'utf-8')
  let result
  try {
    result = execSync(`gh api graphql --input "${tmpFile}"`, { encoding: 'utf-8' })
  } finally {
    try { fs.unlinkSync(tmpFile) } catch { /* ignore */ }
  }
  const data = JSON.parse(result)
  if (data.errors?.length) {
    throw new Error('GraphQL errors:\n' + JSON.stringify(data.errors, null, 2))
  }
  return data.data
}

function log(msg) { process.stdout.write(msg + '\n') }
function step(msg) { process.stdout.write(`\n── ${msg}\n`) }

// ── Main ──────────────────────────────────────────────────────────────────────

step('1 / 8  Get owner node ID')
const { user } = gql(`query { user(login: "${OWNER}") { id } }`)
const ownerId = user.id
log(`   owner id: ${ownerId}`)

step('2 / 8  Create project "GhostLayer MVP"')
const { createProjectV2: { projectV2 } } = gql(`
  mutation {
    createProjectV2(input: {
      ownerId: "${ownerId}"
      title: "GhostLayer MVP"
    }) {
      projectV2 { id number url }
    }
  }
`)
const projectId  = projectV2.id
const projectUrl = projectV2.url
log(`   url: ${projectUrl}`)

step('3 / 8  Create Stage field')
const { createProjectV2Field: { projectV2Field: statusRaw } } = gql(`
  mutation {
    createProjectV2Field(input: {
      projectId: "${projectId}"
      dataType: SINGLE_SELECT
      name: "Stage"
      singleSelectOptions: [
        {name: "Now",         color: GREEN,  description: "Actively being built — max 3 at once"}
        {name: "Next",        color: BLUE,   description: "Up next after Now"}
        {name: "Backlog",     color: GRAY,   description: "Approved and queued"}
        {name: "In Progress", color: YELLOW, description: "Work has started"}
        {name: "Blocked",     color: RED,    description: "Cannot proceed without a decision or dependency"}
        {name: "In Review",   color: ORANGE, description: "PR open or awaiting manual verification"}
        {name: "Done",        color: GREEN,  description: "Acceptance criteria met end-to-end"}
      ]
    }) {
      projectV2Field {
        ... on ProjectV2SingleSelectField {
          id
          options { id name }
        }
      }
    }
  }
`)
const statusFieldId  = statusRaw.id
const statusOptions  = Object.fromEntries(statusRaw.options.map(o => [o.name, o.id]))
log(`   Stage field id: ${statusFieldId}`)
log(`   options:       ${Object.keys(statusOptions).join('  |  ')}`)

step('4 / 8  Create Priority field')
gql(`
  mutation {
    createProjectV2Field(input: {
      projectId: "${projectId}"
      dataType: SINGLE_SELECT
      name: "Priority"
      singleSelectOptions: [
        {name: "P0", color: RED,    description: "Must-have for Slice 1"}
        {name: "P1", color: YELLOW, description: "Important but non-blocking"}
      ]
    }) {
      projectV2Field { ... on ProjectV2SingleSelectField { id } }
    }
  }
`)
log('   done')

step('5 / 8  Create Epic field (text)')
gql(`
  mutation {
    createProjectV2Field(input: {
      projectId: "${projectId}"
      dataType: TEXT
      name: "Epic"
    }) {
      projectV2Field { ... on ProjectV2Field { id } }
    }
  }
`)
log('   done')

step('6 / 8  Create Type field')
gql(`
  mutation {
    createProjectV2Field(input: {
      projectId: "${projectId}"
      dataType: SINGLE_SELECT
      name: "Type"
      singleSelectOptions: [
        {name: "Feature",        color: BLUE,   description: ""}
        {name: "UI",             color: PURPLE, description: ""}
        {name: "State",          color: YELLOW, description: ""}
        {name: "Filesystem",     color: GREEN,  description: ""}
        {name: "Crash",          color: RED,    description: ""}
        {name: "Memory",         color: ORANGE, description: ""}
        {name: "Monetization",   color: PURPLE, description: ""}
        {name: "Error Handling", color: RED,    description: ""}
      ]
    }) {
      projectV2Field { ... on ProjectV2SingleSelectField { id } }
    }
  }
`)
log('   done')

step('7 / 8  Fetch issue node IDs')
const { repository } = gql(`
  query {
    repository(owner: "${OWNER}", name: "${REPO}") {
      issues(first: 50, orderBy: {field: CREATED_AT, direction: ASC}) {
        nodes { id number title }
      }
    }
  }
`)
const issueMap = Object.fromEntries(
  repository.issues.nodes.map(n => [n.number, { id: n.id, title: n.title }])
)
log(`   found: ${Object.keys(issueMap).length} issues`)

step('8 / 8  Add issues + set Status')
const results = { Now: [], Next: [], Backlog: [] }

for (let num = 1; num <= TOTAL_ISSUES; num++) {
  const issue = issueMap[num]
  if (!issue) {
    log(`   #${String(num).padStart(2)}  SKIP — not found`)
    continue
  }

  // Add to project
  const { addProjectV2ItemById: { item } } = gql(`
    mutation {
      addProjectV2ItemById(input: {
        projectId: "${projectId}"
        contentId: "${issue.id}"
      }) {
        item { id }
      }
    }
  `)
  const itemId = item.id

  // Determine and set Status
  const status   = STATUS_MAP[num] || 'Backlog'
  const optionId = statusOptions[status]
  gql(`
    mutation {
      updateProjectV2ItemFieldValue(input: {
        projectId: "${projectId}"
        itemId:    "${itemId}"
        fieldId:   "${statusFieldId}"
        value:     { singleSelectOptionId: "${optionId}" }
      }) {
        projectV2Item { id }
      }
    }
  `)

  results[status].push(`#${num}`)
  const icon = status === 'Now' ? '🟢' : status === 'Next' ? '🔵' : '⚪'
  log(`   ${icon}  ${String(num).padStart(2)}  ${status.padEnd(7)}  ${issue.title.slice(0, 55)}`)
}

// ── Summary ───────────────────────────────────────────────────────────────────
log(`
┌─ Board ready ─────────────────────────────────────────────┐
│  ${projectUrl}
├───────────────────────────────────────────────────────────┤
│  Now     (${String(results.Now.length).padStart(2)})  ${results.Now.join(', ')}
│  Next    (${String(results.Next.length).padStart(2)})  ${results.Next.join(', ')}
│  Backlog (${String(results.Backlog.length).padStart(2)})  all remaining issues
└───────────────────────────────────────────────────────────┘
`)
