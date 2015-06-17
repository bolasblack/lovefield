/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
goog.setTestOnly();
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.cache.ConstraintChecker');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ConstraintCheckerTest');


/** @type {!lf.testing.MockEnv} */
var env;


/** @type {!lf.cache.ConstraintChecker} */
var checker;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  env = new lf.testing.MockEnv();
  env.init().then(function() {
    checker = new lf.cache.ConstraintChecker(lf.Global.get());
    asyncTestCase.continueTesting();
  });

}


function testFindExistingRowIdInPkIndex() {
  var table = env.schema.tables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var row1 = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  var row2 = table.createRow({'id': 'pk2', 'name': 'DummyName'});
  var pk1 = row1.payload()['id'];
  var pk2 = row2.payload()['id'];
  pkIndex.add(pk1, row1.id());
  pkIndex.add(pk2, row2.id());
  assertTrue(pkIndex.containsKey(pk1));
  assertTrue(pkIndex.containsKey(pk2));

  var row3 = table.createRow({'id': pk1, 'name': 'DummyName'});
  var row4 = table.createRow({'id': pk2, 'name': 'DummyName'});
  var row5 = table.createRow({'id': 'otherPk', 'name': 'DummyName'});

  assertEquals(
      row1.id(), checker.findExistingRowIdInPkIndex(table, row3));
  assertEquals(
      row2.id(), checker.findExistingRowIdInPkIndex(table, row4));
  assertNull(checker.findExistingRowIdInPkIndex(table, row5));
}


function testCheckNotNullable() {
  var table = env.schema.tables()[4];

  // Attempting to insert rows that violate the constraint.
  var invalidRows = [1, 2, 3].map(function(primaryKey) {
    return table.createRow({'id': primaryKey.toString(), 'email': null});
  });

  lf.testing.util.assertThrowsError(
      202,  // Attempted to insert NULL value to non-nullable field {0}
      function() {
        checker.checkNotNullable(table, invalidRows);
      });

  // Attempting to insert rows that don't violate the constraint.
  var validRows = [1, 2, 3].map(function(primaryKey) {
    return table.createRow(
        {'id': primaryKey.toString(), 'email': 'emailAddress'});
  });
  assertNotThrows(function() {
    checker.checkNotNullable(table, validRows);
  });
}
