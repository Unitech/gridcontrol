
# Contributing

<div align="center">
<img src="https://raw.githubusercontent.com/keymetrics/gridcontrol/master/docs/flow.png?token=AAuP88IIjugIu6wDbvXGA7pXRDSug4m3ks5XQIyawA%3D%3D"/>
</div>

```bash
$ git clone https://github.com/gridcontrol/gridcontrol
$ cd gridcontrol/
$ npm install
$ GRID="GRID_NAME" API_PORT="API_PORT" node index.js
```

## Debug logs

```bash
$ DEBUG="*" GRID="GrId" node index.js
```

## Tests

Tests are made with mocha and should.

```bash
# (bash test/test.sh && ./node_modules/.bin/mocha grid-api/test/*.mocha.js)
$ npm test

# Test only one file
$ ./node_modules/.bin/mocha test/network.mocha.js
```

## Generating API documentation

It uses JSdoc to create the API documentation.

```bash
$ npm run docs
$ google-chrome apidocs/index.html
```

## Folder structure

```
src/ : Sources
docs/: Documentation
test/: Test file folder
```

##
```
## Repo for PR

[https://github.com/gridcontrol/gridcontrol](https://github.com/gridcontrol/gridcontrol)

##
