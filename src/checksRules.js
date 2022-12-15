async function getRepoRequiredRules(octokit, repoOwner, repo) {
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


export const checkRequiredActions = async (octokit, pullRequest, repoOwner, repo ) => {
    const requiredRules = await getRepoRequiredRules(octokit, repoOwner, repo);
    const commitChecks = pullRequest.commits.nodes[0].commit.statusCheckRollup.contexts.nodes;
    const repoRequiredRules = requiredRules.nodes[0].requiredStatusCheckContexts;

    console.log('commitChecks', commitChecks);
    console.log('repoRequiredRules', repoRequiredRules);


    const statusOfRequiredChecks = commitChecks.map((key) => {
        if (repoRequiredRules.indexOf(key.name) != -1) return key.conclusion;
    }).filter((elem) => elem !== undefined);

    return !statusOfRequiredChecks.includes('FAILURE');
}
