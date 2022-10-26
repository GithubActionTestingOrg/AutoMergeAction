

import * as core from '@actions/core';
import * as github from '@actions/github';

const githubToken = core.getInput('githubToken');
const octokit = new github.GitHub(githubToken);
const context = github.context;

const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo

async function run() {
  try {
    const branch = getOldestBranch();

    const res = await updateBranch({  ...context, branch });

    if (res) {
      core[res.type](res.msg);
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}



function getOldestBranch() {
  let client = github.getOctokit(core.getInput('token'))
  
    let resp = client.rest.pulls.list({
      owner: repoOwner,
      repo: repo,
    }).catch(
      e => {
        core.setFailed(e.message)
      }
    );

    const sortedPrByDate = resp.sort((a, b) => {
         return Date.parse(a) > Date.parse(b);
    });
  
    const oldestPr = sortedPrByDate[0];
  
    return oldestPr;
}


async function updateBranch({
  branch,
  ref,
  repo,
  sha,
}) {
  if (ref === `refs/heads/${branch}`) {
    return {
      type: 'warning',
      msg: 'Commit is already on the destination branch, ignoring',
    };
  }

  if (ref.startsWith('refs/tags/')) {
    const { data: heads } = await octokit.repos.listBranchesForHeadCommit({
      ...repo,
      commit_sha: sha,
    });

    if (!heads.find(value => value.protected)) {
      return {
        type: 'warning',
        msg: 'A tag was pushed but isn\'t head of a protected branch, skipping',
      };
    }
  }

  await octokit.git.updateRef({
    ...repo,
    sha: sha,
    ref: `heads/${branch}`,
  });

  return null;
}


run();
