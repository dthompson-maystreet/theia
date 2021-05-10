/********************************************************************************
 * Copyright (C) 2021 MayStreet Inc. and others
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { inject, injectable, named } from 'inversify';
import { ContributionProvider } from '../../common';
import URI from '../../common/uri';

import * as ws from 'ws';
import ReconnectingWebSocket from 'reconnecting-websocket';

// This may be extended in the future, hence we're sending around an entire class not just an `Endpoint`.
export class WebSocketConnectingData {
    get uri(): URI {
        return this._uri;
    }

    set uri(value: URI) {
        this._uri = value;
    }

    private _uri: URI;

    constructor(uri: URI) {
        this._uri = uri;
    }
}

export class WebSocketCloseEvent {
    get socket(): ReconnectingWebSocket | WebSocket {
        return this._socket;
    }

    get sender(): Object {
        return this._sender;
    }

    get reason(): string {
        return this._reason;
    }

    get code(): number {
        return this._code;
    }

    private readonly _code: number;
    private readonly _reason: string;
    private readonly _sender: Object;
    private readonly _socket: ReconnectingWebSocket | WebSocket;

    constructor(sender: Object, socket: ReconnectingWebSocket | WebSocket, code: number, reason: string) {
        this._sender = sender;
        this._socket = socket;
        this._code = code;
        this._reason = reason;
    }
}

/**
 * Bind components to this symbol to subscribe to WebSocket events.
 */
export const MessagingFrontendListenerContribution = Symbol('MessagingFrontendListenerContribution');

export interface MessagingFrontendListenerContribution {
    /**
     * Function invoked when a websocket connection is opened.
     *
     * @param socket The WebSocket that has been connected.
     */
    onWebSocketOpened(socket: ReconnectingWebSocket | WebSocket | ws): void;

    /**
     * Function invoked when a websocket has been closed.
     *
     * @param event WebSocketCloseEvent event containing sender data and result code.
     */
    onWebSocketClosed(event: WebSocketCloseEvent): void;

    /**
     * Function invoked when a websocket connection is about to be established.
     *
     * Allows a user to change the URL that is supplied.
     *
     * @param connectingData The connecting data that contains the target URL.
     */
    onWebSocketOpening(connectingData: WebSocketConnectingData): void;
}

/**
 * Handler of Theia messaging system events, dispatching to MessagingListenerContribution instances.
 */
@injectable()
export class MessagingFrontendListener {

    @inject(ContributionProvider) @named(MessagingFrontendListenerContribution)
    protected readonly messagingFrontendListenerContributions: ContributionProvider<MessagingFrontendListenerContribution>;

    onWebSocketOpened(socket: ReconnectingWebSocket | WebSocket | ws): void {
        this.messagingFrontendListenerContributions.getContributions().forEach(
            messagingListener => messagingListener.onWebSocketOpened(socket));
    }

    onWebSocketClosed(websocketCloseEvent: WebSocketCloseEvent): void {
        this.messagingFrontendListenerContributions.getContributions().forEach(
            messagingListener => messagingListener.onWebSocketClosed(websocketCloseEvent));
    }

    /**
     * Notify all the subscribed `MessagingFrontendListenerContribution`s that a WebSocket connection is being
     * established. Returns the URL that may have been updated
     */
    onWebSocketOpening(uri: URI): URI {

        const connectingData = new WebSocketConnectingData(uri);

        this.messagingFrontendListenerContributions.getContributions().forEach(
            messagingListener => messagingListener.onWebSocketOpening(connectingData));

        return connectingData.uri;
    }

}
