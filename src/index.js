import * as core from '@actions/core'
import * as github from '@actions/github'

const token = core.getInput('token')
const client = new github.GitHub(token)

async function main() {
    const baseBranch = github.context.payload.ref
    const pullsResponse = await client.pulls.list({
        ...github.context.repo,
        base: baseBranch,
        state: 'open',
    })
    console.log(pullsResponse);

    // const prs = pullsResponse.data

    // const sortedPrByDate = prs.sort((a, b) => {
        // return Date.parse(a) > Date.parse(b);
    // });
    // console.log(sortedPrByDate);
     // await Promise.resolve(
    //         client.pulls.updateBranch({
    //             ...github.context.repo,
    //             pull_number: sortedPrByDate[0].number,
    //         })
    // )
}

main();