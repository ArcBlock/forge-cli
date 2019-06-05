DEBUG=* node tools/setup-ci.js

npm publish

node tools/update-readme.js
git commit -nam 'update readme'
git push origin master --no-verify
