import { Component } from 'react'

// A failed optional account chunk must never take down the local tracker.
export default class OptionalAccountBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <section id="account" className="section-wrap account-section" role="status">Account controls could not load. Your local tracker and check-ins remain available. Save local changes, then reload when connected to try Account / Sync again.</section>
    return this.props.children
  }
}
