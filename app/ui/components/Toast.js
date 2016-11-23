import React, {PropTypes, Component} from 'react';
import classnames from 'classnames';
import Link from './base/Link';
import * as fetch from '../../common/fetch';
import {trackEvent} from '../../analytics/index';

const LOCALSTORAGE_KEY = 'insomnia::notifications::seen';

class Toast extends Component {
  constructor (props) {
    super(props);

    this.state = {
      notification: null,
      visible: false,
    };
  }

  _loadSeen () {
    try {
      return JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  _handleDismissActiveNotification () {
    const {notification} = this.state;
    if (!notification) {
      return;
    }

    // Hide the currently showing notification
    this.setState({visible: false});

    // Give time for toast to fade out, then remove it
    setTimeout(() => {
      this.setState({notification: null});
    }, 1000);
  }

  async _handleCheckNotifications () {
    // If there is a notification open, skip check
    if (this.state.notification) {
      return;
    }

    const seenNotifications = this._loadSeen();

    let notification;
    try {
      notification = await fetch.get('/notification');
    } catch (e) {
      console.warn('[toast] Failed to fetch notifications', e);
    }

    // No new notifications
    if (!notification) {
      return;
    }

    // We've already seen this one, so bail
    if (seenNotifications && seenNotifications[notification.key]) {
      return;
    }

    // Remember that we've seen it
    seenNotifications[notification.key] = true;
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(seenNotifications, null, 2));

    // Show the notification
    this.setState({notification, visible: false});

    // Fade the notification in
    setTimeout(() => this.setState({visible: true}), 1000);

    trackEvent('Notification', 'Shown', notification.key);
  }

  componentDidMount () {
    setInterval(() => this._handleCheckNotifications(), 1000);
  }

  render () {
    const {notification, visible} = this.state;

    if (!notification) {
      return null;
    }

    return (
      <div className={classnames('toast', {'toast--show': visible})}>
        <div className="toast__message">
          {notification ? notification.message : 'Unknown'}
        </div>
        <div className="toast__action">
          <Link className="btn btn--super-duper-compact btn--outlined no-wrap"
                onClick={e => {
                  trackEvent('Notification', 'Click', notification.key);
                  this._handleDismissActiveNotification();
                }}
                button={true}
                href={notification.url}>
            {notification.cta}
          </Link>
        </div>
        <div className="toast__action toast__action--close">
          <button className="btn btn--super-duper-compact"
                  onClick={e => {
                    this._handleDismissActiveNotification();
                    trackEvent('Notification', 'Dismiss', notification.key);
                  }}>
            <i className="fa fa-close"></i>
          </button>
        </div>
      </div>
    )
  }
}

Toast.propTypes = {};

export default Toast;