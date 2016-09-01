#
# Gridfile Server Access ID Card
#

grid_name     = 'grid-test-1'
#grid_password =

#keymetrics_public =
#keymetrics_secret =

servers = [
  'root@212.47.227.158',
  'root@163.172.151.155',
  'root@163.172.145.241'
]

ssh_key = '''
%SSH_SECRET%'''

ssh_public_key = '''
%SSH_PUBLIC%'''
