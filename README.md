# ec2-ssh

[![Build Status](https://travis-ci.org/philsch/ec2-ssh.svg?branch=master)](https://travis-ci.org/philsch/ec2-ssh)
[![npm version](https://badge.fury.io/js/ec2-ssh.svg)](https://badge.fury.io/js/ec2-ssh)

Console tool based on NodeJS that simplifies connecting to AWS EC2 instances.

![](docs/example.gif)

## Installation

1. Ensure AWS API credentials are configured (e.g. by installing AWS CLI and running `aws configure`)
2. `npm -g install ec2-ssh`
3. During installation, you can choose how to install the auto-suggestion based on *node-tabtab*

## Features

- Tab completion lists your current running AWS instances
- EC2 name-tag is displayed
- User and path to SSH-Key is cached for each instance
- ...

## Contribute

Feel free to create pull or feature requests for this project.