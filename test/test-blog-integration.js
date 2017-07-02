const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout this module
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

const seedNumber = 10;

//To allow for future changes, the test never interacts directly with the database 
//except when seeding data; everything is done via HTML requests.

function generateBlogData() {
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		title: faker.lorem.sentence(),
		content: faker.lorem.paragraph()
	}
}

function seedBlogData() {
	console.info('seeding blog data');
	const seedData = [];

	for (let i=1; i<=seedNumber; i++) {
	seedData.push(generateBlogData());
	}
	// this will return a promise
	return BlogPost.insertMany(seedData);
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {
	before(function() {
    	return runServer(TEST_DATABASE_URL);
  	});

	beforeEach(function() {
    	return seedBlogData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	});

  describe('GET endpoint', function() {

    it('should return all existing posts', function() {
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          res.should.have.status(200);
          res.body.should.have.lengthOf.at.least(1);
          return BlogPost.count();
        })
        .then(function(count) {
          res.body.should.have.lengthOf(count);
        });
    });


    it('should return posts with right fields', function() {

      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res) {
          res.should.have.status(200);
          res.should.be.json;
          res.body.should.be.a('array');
          res.body.should.have.lengthOf.at.least(1);

          res.body.forEach(function(post) {
            post.should.be.a('object');
            post.should.include.keys(
              'id', 'author', 'title', 'content', 'created');
          });
          resPost = res.body[0];
          return BlogPost.findById(resPost.id);
        })
        .then(function(post) {

          resPost.id.should.equal(post.id);
          resPost.title.should.equal(post.title);
          resPost.content.should.equal(post.content);
          resPost.author.should.equal(`${post.author.firstName} ${post.author.lastName}`);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new blog post', function() {

      const newPost = generateBlogData();
      let created;

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          res.should.have.status(201);
          res.should.be.json;
          res.body.should.be.a('object');
          res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
          res.body.title.should.equal(newPost.title);
          res.body.id.should.not.be.null;
          res.body.created.should.not.be.null;
          created = res.body.created;
          res.body.content.should.equal(newPost.content);
          res.body.author.should.equal(
          	`${newPost.author.firstName} ${newPost.author.lastName}`);

          return BlogPost.findById(res.body.id);
        })
        .then(function(post) {
          post.title.should.equal(newPost.title);
          post.content.should.equal(newPost.content);
          post.author.firstName.should.equal(newPost.author.firstName);
          post.author.lastName.should.equal(newPost.author.lastName);

        });
    });
  });

  describe('PUT endpoint', function() {

    // strategy:
    //  1. Get an existing restaurant from db
    //  2. Make a PUT request to update that restaurant
    //  3. Prove restaurant returned by request contains data we sent
    //  4. Prove restaurant in db is correctly updated
    it('should update fields you send over', function() {
      const updateData = {
        author: {
        	firstName: 'boo',
    		lastName: 'foo'},
        title: 'Mooooo!'
      };

      return BlogPost
        .findOne()
        .exec()
        .then(function(post) {
          updateData.id = post.id;

          // make request then inspect it to make sure it reflects
          // data we sent
          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res) {
          res.should.have.status(201);

          return BlogPost.findById(updateData.id).exec();
        })
        .then(function(post) {
          post.author.firstName.should.equal(updateData.author.firstName);
          post.author.lastName.should.equal(updateData.author.lastName);
          post.title.should.equal(updateData.title);
        });
      });
  });

  describe('DELETE endpoint', function() {
    it('delete a blog post by id', function() {

      let post;

      return BlogPost
        .findOne()
        .exec()
        .then(function(_post) {
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          res.should.have.status(204);
          return BlogPost.findById(post.id).exec();
        })
        .then(function(_post) {
          should.not.exist(_post);
        });
    });
  });
});
