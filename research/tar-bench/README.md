
# Compression benchmark

Node 4.4.4

## Archiver

Compression:

- zip: 2290ms, 5,2M
- tar: 1200ms, 15M
- **tgz: 1230ms, 3,8M**

## tar-fs

tar-fs has tar and untar algo builting

-> ./tar-fs
- tar: 915ms, 16M
- **tgz (tar-fs + zlib.gzip): 1114ms, 3.3M**

## node-archiver

- tgz: 2821ms, 3,4M

## tar-pack

- tgx: 2929ms, 3,4M
