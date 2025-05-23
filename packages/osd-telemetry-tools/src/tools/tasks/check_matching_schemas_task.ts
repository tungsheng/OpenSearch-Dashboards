/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as path from 'path';
import { TaskContext } from './task_context';
import { checkMatchingMapping } from '../check_collector_integrity';
import { readFileAsync } from '../utils';

export function checkMatchingSchemasTask({ roots }: TaskContext, throwOnDiff: boolean) {
  return roots.map((root) => ({
    task: async () => {
      const fullPath = path.resolve(process.cwd(), root.config.output);
      const opensearchMappingString = await readFileAsync(fullPath, 'utf8');
      const opensearchMapping = JSON.parse(opensearchMappingString);

      if (root.parsedCollections) {
        const differences = checkMatchingMapping(root.parsedCollections, opensearchMapping);
        root.opensearchMappingDiffs = Object.keys(differences);
        if (root.opensearchMappingDiffs.length && throwOnDiff) {
          throw Error(
            `The following changes must be persisted in ${fullPath} file. Use '--fix' to update.\n${JSON.stringify(
              differences,
              null,
              2
            )}`
          );
        }
      }
    },
    title: `Checking in ${root.config.root}`,
  }));
}
