import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import test from "node:test"

const source = readFileSync(new URL("../scripts/homelab/deploy-stack.sh", import.meta.url), "utf8")
const migrationWait = source.slice(source.indexOf("wait_for_migration()"), source.indexOf("web_container_id()"))

function waitForScenario(scenario: string) {
  const result = spawnSync("sh", ["-c", `
MIGRATE_SERVICE=brabustore_migrate
ticks=0
sleep() { ticks=$((ticks + 1)); }
docker() {
  if [ "$1" = service ] && [ "$2" = inspect ]; then
    printf '13\n'
  elif [ "$1" = service ] && [ "$2" = ps ]; then
    case "$*" in
      *-q*)
        if [ "$TEST_SCENARIO" != missing ]; then printf 'current\n'; fi
        printf 'historical\n'
        ;;
      *)
        case "$TEST_SCENARIO" in
          history-rejected)
            if [ "$ticks" -eq 0 ]; then printf 'Pending 1 second ago|\n'; else printf 'Complete 1 second ago|\n'; fi
            printf 'Rejected 5 minutes ago|old network error\n' ;;
          missing) printf 'Rejected 5 minutes ago|old network error\n' ;;
          history-complete) printf 'Running 1 second ago|\nComplete 5 minutes ago|\n' ;;
          history-complete-failed) printf 'Failed 1 second ago|new failure\nComplete 5 minutes ago|\n' ;;
          failed) printf 'Failed 1 second ago|new failure\n' ;;
          rejected) printf 'Rejected 1 second ago|new rejection\n' ;;
          complete) printf 'Complete 1 second ago|\n' ;;
        esac
        ;;
    esac
  elif [ "$1" = inspect ]; then
    for argument do task_id=$argument; done
    if [ "$task_id" = historical ]; then
      case "$TEST_SCENARIO" in
        history-complete|history-complete-failed) printf '12|complete\n' ;;
        *) printf '12|rejected\n' ;;
      esac
    else
      case "$TEST_SCENARIO" in
        history-rejected)
          if [ "$ticks" -eq 0 ]; then printf '13|pending\n'; else printf '13|complete\n'; fi ;;
        history-complete) printf '13|running\n' ;;
        failed|history-complete-failed) printf '13|failed\n' ;;
        rejected) printf '13|rejected\n' ;;
        complete) printf '13|complete\n' ;;
      esac
    fi
  else
    return 99
  fi
}
${migrationWait}
if wait_for_migration; then outcome=0; else outcome=1; fi
printf '%s|%s' "$outcome" "$ticks"
`], { env: { ...process.env, TEST_SCENARIO: scenario }, encoding: "utf8", timeout: 5000 })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout
}

test("deployment waits for the current migration despite an older rejected task", () => {
  assert.equal(waitForScenario("history-rejected"), "0|1")
})

test("an older completed migration cannot approve a current running task", () => {
  assert.equal(waitForScenario("history-complete"), "1|60")
})

test("an older completed migration cannot hide a current failed task", () => {
  assert.equal(waitForScenario("history-complete-failed"), "1|0")
})

test("deployment waits for a new task to appear instead of rejecting old history", () => {
  assert.equal(waitForScenario("missing"), "1|60")
})

for (const state of ["failed", "rejected"]) {
  test(`a ${state} current migration stops deployment`, () => {
    assert.equal(waitForScenario(state), "1|0")
  })
}

test("a completed current migration permits deployment", () => {
  assert.equal(waitForScenario("complete"), "0|0")
})
