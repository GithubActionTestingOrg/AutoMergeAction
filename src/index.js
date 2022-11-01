const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

const token = core.getInput('token');
// const octokit = new github.getOctokit(token);
const octokit = new Octokit({ auth: token });
const baseBranch = github.context.payload.ref
const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo

 const getPullRequests = async () => {
    const resp = octokit.rest.pulls.list({
        owner: repoOwner,
        repo: repo,
    }).catch(
        e => {
            core.setFailed(e.message)
        }
     )
    return resp;
}

async function main() {

    const pullRequestsList = await getPullRequests();

    const filteredPrs = pullRequestsList.data
        .filter((pr) => pr.auto_merge !== null)
        .sort((a, b) => {
            return Date.parse(b.created_at) - Date.parse(a.created_at);
        }
    );
    if (!filteredPrs.length) {
        console.log('auto-merge prs is not found');
        return
    }
    
    try { 
        await octokit.request(
            'PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch',
            {
              owner: repoOwner,
              repo: repo,
              pull_number: filteredPrs[0].number,
            }
        ).then(() => {console.log('updated', filteredPrs[0].number)})
        
        // await octokit.rest.pulls.update({
        //     owner: repoOwner,
        //     repo: repo,
        //     pull_number: filteredPrs[0].number,
        //     body: {},
        // }).then(() => {console.log('updated', filteredPrs[0].number)});
    } catch (error) {
        console.warn('error', error);
    }  
}

main();