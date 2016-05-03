

## Ideas

- [ ] Socket that are not identified (not sent 'identify' data) can break stuff (.getPeers return all sockets)
- [ ] Fix returned synchronized flag when listing
- [ ] At initialization check that http connection can be made
- [ ] restart master strategies (leveldb for persistence?)

- [X] Build smart LB
- [ ] Build CLI (+ list connected host via identity)

- [X] Use discovery-swarm
- [X] patch discovery-swam with TLS
- [X] Fix issue, tests some time fail
- [ ] Add AUTH via env variable ([X] NS and AUTH/PASS)

- [X] Fix issue port on script restart
- [X] Report error when task has been retried more than 8 times (8 seconds)
- [X] call client.invoke instead of exec (alias)
- [NOK] Objectify Peer (keep array of Peer object instead of raw socket obj)

- [ ] Graphic documentation (refers to paper notes)
- [ ] Add TLS on HTTP
- [ ] Compatibility with Amazon lamda/apdex
- [ ] Transpose client in Python, Java, Go
___

- [ ] Keep track of current processing tasks
- X Instead of HTTP /trigger, socket? = add new route /forward or /exec to force local balancing
- ? Start the main applications on slave node in other peers

- LB implement broadcast strategy
- configuration of tasks (JSON conf (ecosystem)? max memory/timeout?)
- keep counter of invokations, errors

## PM2

- when passing env object to pm2.start, the original object get modified..
- bundledDependecnies
- upgrade to cli-table-2
- pm2 ls --watch
- Remove banner Keymetrics (or at least make it smaller)
