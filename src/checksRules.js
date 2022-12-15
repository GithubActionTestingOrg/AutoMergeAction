const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

const core = require('@actions/core');
const token = core.getInput('token');

const octokit = new Octokit({ auth: token });
const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo

async function getRepoRequiredRules() {
    const rules = await octokit.graphql(`query ($owner: String!, $repo: String!) {
        repository(name: $repo, owner: $owner) {
          branchProtectionRules(last: 1) {
              nodes {
                requiredStatusCheckContexts
              }
          }
        }
      }`,
        {
            owner: repoOwner,
            repo: repo,
        });
    
    return rules.repository.branchProtectionRules;
}


export const checkRequiredActions = async (pullRequest) => {
    const requiredRules = await getRepoRequiredRules();
    const commitChecks = pullRequest.commits.nodes[0].commit.statusCheckRollup.contexts.nodes;
    const repoRequiredRules = requiredRules.nodes[0].requiredStatusCheckContexts;

    const statusOfRequiredChecks = commitChecks.map((key) => {
        if (repoRequiredRules.indexOf(key.name) != -1) return key.conclusion;
    }).filter((elem) => elem !== undefined);

    return !statusOfRequiredChecks.includes('FAILURE');
}
