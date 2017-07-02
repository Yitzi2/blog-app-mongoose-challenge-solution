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
		name: {
			firstName: faker.name.firstName,
			lastName: faker.name.lastName
		},
		title: faker.lorem.sentence,
		content: faker.lorem.paragraph
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
    	return seedRestaurantData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	});

	describe('GET endpoint', function () {

		it('should return the correct status and number of posts', function () {
			let res;
			return chai.request(app)
			.get('/posts')
			.then(function(_res) {
				res = _res;
				res.should.have.status(200);
				res.should.be.json;
				res.body.blogPosts.should.be.an('array');
				res.body.blogPosts.should.have.length.of(seedNumber);
			});
		});

		it('should return posts with the right fields', function () {
			let resPost;
			return chai.request(app)
        	.get('/posts')
        	.then(function(res) {
        		//Repeat conditions from before as well, to double-check for the new seed.
				res.should.have.status(200);
				res.body.restaurants.should.be.an('array');
				res.body.blogPosts.should.have.length.of(seedNumber);
				res.body.blogPosts.forEach(function(post) {
			        post.should.be.an('object');
			        post.should.have.all.nested.keys(
					'id', 'author.firstName', 'author.lastName', 'title', 'content', 'created');
				});
			});
		});
	
	});

});