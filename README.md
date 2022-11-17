# Update branches with enabled auto-merge action

Use example: 

```sh
name: PR update

on:
  push:
    branches:
      - "master"

jobs:
    autoupdate:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - name: Update AutoMerged Pull Request
              uses: GithubActionTestingOrg/AutoMergeAction@v2.1
              with:
                  token: ${{ secrets.GH_TOKEN }}
                  head: 'master'
```

Inputs:
 - token (required) - Github token required to push the commit to the branch
 - head (required)  - Name of yours main branch which needs to be updated
