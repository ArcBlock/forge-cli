git config --local user.name "wangshijun"
git config --local user.email "wangshijun2010@gmail.com"

git remote remove origin
git remote add origin "https://$GITHUB_TOKEN@github.com/$TRAVIS_REPO_SLUG.git"
git remote -v
git pull origin master
git branch -a

DEBUG=* node tools/setup-ci.js

# update readme
node tools/update-readme.js
git checkout master
git commit -nam 'update readme'
git push origin master --no-verify

npm publish

# trigger cnpm sync
node tools/post-publish.js
