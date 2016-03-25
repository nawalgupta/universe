var chai = require('chai')
var expect = chai.expect

var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)


var universe = require('../universe');
var data = require('./data');
var crossfilter = require('crossfilter2');

describe('universe postAggregation', function() {

  var u = universe(crossfilter(data))

  beforeEach(function() {
    return u.then(function(u) {
      return u.clear()
    })
  })

  it('can do chained general post aggregations', function() {
    var before
    var after
    var after2
    return u.then(function(u) {
        return u.query({
          groupBy: 'type'
        })
      })
      .then(function(res) {
        before = res
        before.lock()
        expect(before.data).to.deep.equal([
          { key: 'cash', value: { count: 2 }},
          { key: 'tab', value: { count: 8 }},
          { key: 'visa', value: { count: 2 }}
        ])
        return res.post(function(q){
          q.data[0].value.count += 10
          q.data[2].key += '_test'
        })
      })
      .then(function(res){
        after = res
        after.lock()
        expect(after.data).to.deep.equal([
          { key: 'cash', value: { count: 12 }},
          { key: 'tab', value: { count: 8 }},
          { key: 'visa_test', value: { count: 2 }}
        ])
        return res.post(function(q){
          q.data[0].value.count += 10
          q.data[2].key += '_test'
        })
          .then(function(res){
            after2 = res
            after2.lock()
          })
      })
      .then(function(){
        return u.then(function(u){
          return u.filter('total', '100')
        })
      })
      .then(function(){
        expect(before.data).to.deep.equal([
          { key: 'cash', value: { count: 1 }},
          { key: 'tab', value: { count: 0 }},
          { key: 'visa', value: { count: 0 }}
        ])
        expect(after.data).to.deep.equal([
          { key: 'cash', value: { count: 11 }},
          { key: 'tab', value: { count: 0 }},
          { key: 'visa_test', value: { count: 0 }}
        ])
        expect(after2.data).to.deep.equal([
          { key: 'cash', value: { count: 21 }},
          { key: 'tab', value: { count: 0 }},
          { key: 'visa_test_test', value: { count: 0 }}
        ])
      })
  })

  it('can sortByKey ascending and descending', function() {
    return u.then(function(u) {
        return u.query({
          groupBy: 'type'
        })
      })
      .then(function(res) {
        return res.sortByKey(true)
      })
      .then(function(res) {
        expect(res.data[0].key).to.equal('visa')
        return res.sortByKey()
      })
      .then(function(res) {
        expect(res.data[0].key).to.equal('cash')
        return res.sortByKey(true)
      })
      .then(function(res) {
        return u.then(function(u) {
            return u.filter('total', 100)
          })
          .then(function(u){
            return res
          })
      })
      .then(function(res) {
        expect(res.data[0].key).to.equal('visa')
      })
  })

  it('can limit', function() {
    return u.then(function(u) {
        return u.query({
          groupBy: 'total',
        })
      })
      .then(function(res) {
        return res.limit(2, null)
      })
      .then(function(res) {
        expect(res.data[0].key).to.equal(190)
      })
  })

  it('can squash', function() {
    return u.then(function(u) {
        return u.query({
          groupBy: 'total',
          select: {
            $sum: 'total'
          }
        })
      })
      .then(function(res) {
        return res.squash(2, 4, {
          sum: '$sum'
        }, 'SQUASHED!!!')
      })
      .then(function(res) {
        expect(res.data[2].key).to.equal('SQUASHED!!!')
        expect(res.data[2].value.sum).to.equal(780)
      })
  })


})
