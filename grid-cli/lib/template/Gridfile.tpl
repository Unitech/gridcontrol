#
# Gridfile Server Access ID Card
#

grid_name     = 'grid-test-1'
#grid_password =

servers = [
  'ubuntu@ip1',
  'ubuntu@ip2',
  'ubuntu@ip3'
]

ssh_key = '''
%SSH_SECRET%'''

ssh_public_key = '''
%SSH_PUBLIC%'''
