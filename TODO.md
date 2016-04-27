
## Ideas

- [ ] Use discovery-swarm and patch with TLS
- [ ] Add AUTH via env variable (NS and AUTH/PASS)

- [X] Fix issue port on script restart
- [X] Report error when task has been retried more than 8 times (8 seconds)
- [X] call client.invoke instead of exec (alias)
- [ ] Objectify Peer (keep array of Peer object instead of raw socket obj)

- [ ] Graphic documentation (refers to paper notes)
- [ ] Add TLS on HTTP
- [ ] Round robin load balancer
- [ ] Build CLI (+ list connected host via identity)
- [ ] Compatibility with Amazon lamda/apdex
- [ ] Transpose client in Python, Java, Go
___

- [ ] Keep track of current processing tasks
- X Instead of HTTP /trigger, socket? = add new route /forward or /exec to force local balancing
- ? Start the main applications on slave node in other peers

- LB implement broadcast strategy
- configuration of tasks (JSON conf (ecosystem)? max memory/timeout?)
- keep counter of invokations, errors
