# photosearch
Building a highly performant photosearch with Elasticsearch, Docker, and AngularJS

Read more about this project on my [blog](http://blog.sandeepchivukula.com)

# Instructions

## Part 1: Search Infrastructure

_Prerequisites: Docker and Docker host._

Clone the repo and in the top level run `docker-compose up`

## Part 2: Indexing

_Prerequisites: nodejs; node canvas - which requries [node-gyp and cairo](https://github.com/Automattic/node-canvas#installation)_

In the indexer directory run `npm install` to set up the dependencies.

Then run `node index.js <path to photos>`

# Part 3: 

The photosearchapp folder has a simple angular app which connects to your elasticsearch instance. Be sure to change the server in `app.js` to point to your instance and to change the photo path in the `main.html` file. 

Licensing information in the LICENSE file
