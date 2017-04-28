
## Key Feature

- [ ] Express decapsulator POC
- [ ] Transpose client in Python, Java, Go

## Todo

- configuration of tasks (JSON conf (ecosystem)? max memory/timeout?)
- [ ] when doing grid dump (conf:update) -> if address has 192.168.*.* = dump private ip instead of public
- [ ] allow to activate each grid control part (discovery, file sharing, pub/sub)
- [X] be able to customize configuration for each host instead of a simple host array
- [X] ssh-add private key when provisioning
- [X] generate gridfile with random grid name and random password
- [X] Fix when Gridfile is missing (sometime no message is thrown)

- [X] Better pm2 logs integration
- [X] LB implement broadcast strategy
- [X] fix npm-shrinkwrap (change from git to npm packages?)
- [X] test with remote computer to interconnect odroid in a local network
- [NOK] Web interface for gridcontrol
- [X] Add password to grid provision
- [X] Auto reconnect dashboard
- [X] keep counter of invokations, errors
- [~] Grid upgrade = dont keep namespace
- [X] Add AUTH via env variable ([X] NS and AUTH/PASS)
- [NOK] grid-cli $ grid status -> print computing powert (CPU usage vary)
- [X] Integrate multissh with CLI (multissh)
- [X] Modularize multi ssh blessed based capability
- [X] Keymetrics integration : grid install keymetrics <private_key> <public_key>
------> Keymetrics access: grid keymetrics access
------> Change namespace: grid namespace <new:namespace>
- [X] Socket that are not identified (not sent 'identify' data) can break stuff (.getPeers return all sockets)
- [X] Compatibility with Amazon lamda/apdex
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
