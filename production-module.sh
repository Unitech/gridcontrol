
rm -rf node_modules
npm install

find node_modules \( -name "example" -o -name "examples" -o -name "docs" -o -name "jsdoc" -o -name "jsdocs" -o -name "test" -o -name "tests" -o -name "*\.md" -o -name "*\.html" -o -name "*\.eot" -o -name "*\.svg" -o -name "*\.woff" \) -print -exec rm -rf {} \;

find node_modules -type d \( -name "example" -o -name "examples" -o -name "docs" -o -name "jsdoc" -o -name "jsdocs" -o -name "test" -o -name "tests" -o -name "*\.md" -o -name "*\.html" -o -name "*\.eot" -o -name "*\.svg" -o -name "*\.woff" \) -print -exec rm -rf {} \;

npm install -g json
RET=`node -e "var pkg = require('./package.json'); console.log(Object.keys(pkg.dependencies))"`
json -I -f package.json -e "this.bundledDependencies=$RET"

npm test && rm -rf node_modules && npm install --production
