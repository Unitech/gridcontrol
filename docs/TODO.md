

## Ideas

- [ ] LB implement broadcast strategy
- [ ] keep counter of invokations, errors
- [~] Grid upgrade = dont keep namespace
- [X] Add AUTH via env variable ([X] NS and AUTH/PASS)
- [NOK] grid-cli $ grid status -> print computing powert (CPU usage vary)
- [ ] blessed-contrib build a dashboard with list of node connected + tasks
- [x] Integrate multissh with CLI (multissh)

- [X] Modularize multi ssh blessed based capability
------> Keymetrics integration : grid install keymetrics <private_key> <public_key>
------> Keymetrics access: grid keymetrics access
------> Change namespace: grid namespace <new:namespace>

- [X] Socket that are not identified (not sent 'identify' data) can break stuff (.getPeers return all sockets)
- [X] Compatibility with Amazon lamda/apdex
- [ ] Transpose client in Python, Java, Go
- [X] Fix returned synchronized flag when listing
- [NOK- not anymore http between peers] At initialization check that http connection can be made
- [X] restart master strategies (leveldb for persistence?)

- [X] Build smart LB
- [X] Build CLI (+ list connected host via identity)

- [X] Use discovery-swarm
- [X] patch discovery-swam with TLS
- [X] Fix issue, tests some time fail


- [X] Fix issue port on script restart
- [X] Report error when task has been retried more than 8 times (8 seconds)
- [X] call client.invoke instead of exec (alias)
- [NOK] Objectify Peer (keep array of Peer object instead of raw socket obj)

- [~] Graphic documentation (refers to paper notes)
- [NOK - HTTP listen only local] Add TLS on HTTP
___

- [ ] Keep track of current processing tasks
- X Instead of HTTP /trigger, socket? = add new route /forward or /exec to force local balancing
- ? Start the main applications on slave node in other peers


- configuration of tasks (JSON conf (ecosystem)? max memory/timeout?)


## Keymetrics

- Any PM2 linked for free
- Add actions env

## PM2

- modclean problems
- pm2 save [filename.json]
- integrate modprobe for pm2 revision publishing
- refactor or add a way to manage multiple PM2 via common interface (like a class)
- Not possible to specify the SOCK files or at lear the PM2_HOME when initializing Satan via pm2.connect
- when passing env object to pm2.start, the original object get modified..
- bundledDependecnies
- upgrade to cli-table-2
- pm2 ls --watch
- Remove banner Keymetrics (or at least make it smaller)
