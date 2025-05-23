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

import React, { useState } from 'react';
import { i18n } from '@osd/i18n';
import { saveAs } from 'file-saver';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiPageContent } from '@elastic/eui';
import { ConsoleHistory } from '../console_history';
import { Editor } from '../editor';
import { Settings } from '../settings';

import {
  TopNavMenu,
  WelcomePanel,
  HelpPanel,
  SomethingWentWrongCallout,
  NetworkRequestStatusBar,
  ImportFlyout,
} from '../../components';

import { useServicesContext, useEditorReadContext, useRequestReadContext } from '../../contexts';
import { useDataInit } from '../../hooks';

import { getTopNavConfig } from './get_top_nav';

interface MainProps {
  dataSourceId?: string;
}

export function Main({ dataSourceId }: MainProps) {
  const {
    services: { storage, objectStorageClient, uiSettings },
  } = useServicesContext();

  const { ready: editorsReady } = useEditorReadContext();

  const {
    requestInFlight: requestInProgress,
    lastResult: { data: requestData, error: requestError },
  } = useRequestReadContext();

  const [showWelcome, setShowWelcomePanel] = useState(
    () => storage.get('version_welcome_shown') !== '@@SENSE_REVISION'
  );

  const [showingHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showImportFlyout, setShowImportFlyout] = useState(false);

  const onExport = async () => {
    const results = await objectStorageClient.text.findAll();
    const senseData = results.sort((a, b) => a.createdAt - b.createdAt)[0];
    const blob = new Blob([JSON.stringify(senseData || {})], { type: 'application/json' });
    saveAs(blob, 'sense.json');
  };

  const renderConsoleHistory = () => {
    return editorsReady ? <ConsoleHistory close={() => setShowHistory(false)} /> : null;
  };
  const { done, error, retry } = useDataInit();

  if (error) {
    return (
      <EuiPageContent>
        <SomethingWentWrongCallout onButtonClick={retry} error={error} />
      </EuiPageContent>
    );
  }

  const lastDatum = requestData?.[requestData.length - 1] ?? requestError;

  const useUpdatedUX = uiSettings.get('home:useNewHomePage');

  const networkRequestStatusBarContent = (
    <EuiFlexItem grow={false} className={useUpdatedUX ? '' : 'conApp__tabsExtension'}>
      <NetworkRequestStatusBar
        requestInProgress={requestInProgress}
        requestResult={
          lastDatum
            ? {
                method: lastDatum.request.method.toUpperCase(),
                endpoint: lastDatum.request.path,
                statusCode: lastDatum.response.statusCode,
                statusText: lastDatum.response.statusText,
                timeElapsedMs: lastDatum.response.timeMs,
              }
            : undefined
        }
      />
    </EuiFlexItem>
  );

  return (
    <div id="consoleRoot">
      <EuiFlexGroup
        className={`consoleContainer useUpdatedUX-${!!useUpdatedUX}`}
        gutterSize="none"
        direction="column"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle className="euiScreenReaderOnly">
            <h1>
              {i18n.translate('console.pageHeading', {
                defaultMessage: 'Console',
              })}
            </h1>
          </EuiTitle>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem>
              <TopNavMenu
                disabled={!done}
                useUpdatedUX={useUpdatedUX}
                items={getTopNavConfig({
                  useUpdatedUX,
                  onClickHistory: () => setShowHistory(!showingHistory),
                  onClickSettings: () => setShowSettings(true),
                  onClickHelp: () => setShowHelp(!showHelp),
                  onClickExport: () => onExport(),
                  onClickImport: () => setShowImportFlyout(!showImportFlyout),
                })}
                rightContainerChildren={networkRequestStatusBarContent}
              />
            </EuiFlexItem>
            {useUpdatedUX ? null : networkRequestStatusBarContent}
          </EuiFlexGroup>
        </EuiFlexItem>
        {showingHistory ? <EuiFlexItem grow={false}>{renderConsoleHistory()}</EuiFlexItem> : null}
        <EuiFlexItem>
          <Editor useUpdatedUX={useUpdatedUX} loading={!done} dataSourceId={dataSourceId} />
        </EuiFlexItem>
      </EuiFlexGroup>

      {done && showWelcome ? (
        <WelcomePanel
          onDismiss={() => {
            storage.set('version_welcome_shown', '@@SENSE_REVISION');
            setShowWelcomePanel(false);
          }}
        />
      ) : null}

      {showSettings ? (
        <Settings onClose={() => setShowSettings(false)} dataSourceId={dataSourceId} />
      ) : null}

      {showHelp ? <HelpPanel onClose={() => setShowHelp(false)} /> : null}

      {showImportFlyout ? (
        <ImportFlyout refresh={retry} close={() => setShowImportFlyout(false)} />
      ) : null}
    </div>
  );
}
