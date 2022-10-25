const core = require('@actions/core');
const wait = require('./wait');


// most @actions toolkit packages have async methods
async function run() {
  try {
    const ms = core.getInput('milliseconds');
    core.info(`Waiting ${ms} milliseconds ...`);

    const repoOwner = github.context.repo.owner
    const repo = github.context.repo.repo

    let client = github.getOctokit(core.getInput('token'))
    let resp = client.rest.pulls.list({
      owner: repoOwner,
      repo: repo,
    }).catch(
      e => {
        core.setFailed(e.message)
      }
    );

    core.debug(resp);

    core.debug((new Date()).toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    await wait(parseInt(ms));
    core.info((new Date()).toTimeString());

    core.setOutput('time', resp);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
