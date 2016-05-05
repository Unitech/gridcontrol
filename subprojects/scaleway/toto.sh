
bash -c "npm install -g json; RET=`node -e "var pkg = require('./package.json'); console.log(Object.keys(pkg.dependencies))"`; json -I -f package.json -e \"this.bundledDependencies=$RET\""
