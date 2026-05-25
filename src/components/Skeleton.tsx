import React from 'react';

export function SkeletonReel() {
  return (
    <section className="reel">
      <div className="reel-head">
        <div className="skeleton skeleton-circle" style={{ width: 32, height: 32 }} />
        <div className="skeleton" style={{ width: 120, height: 12 }} />
      </div>
      <div className="skeleton" style={{ flex: 1, minHeight: 0 }} />
      <div className="reel-foot">
        <div className="skeleton" style={{ width: 200, height: 12, margin: '12px 14px' }} />
      </div>
    </section>
  );
}

export function SkeletonStories() {
  return (
    <>
      {[1, 2, 3, 4, 5].map(i => (
        <div className="story" key={i}>
          <div className="story-ring empty">
            <div className="story-ava skeleton skeleton-circle" style={{ width: '100%', height: '100%', border: 'none' }} />
          </div>
          <div className="skeleton" style={{ width: 40, height: 10, margin: '0 auto' }} />
        </div>
      ))}
    </>
  );
}

export function SkeletonActivity() {
  return (
    <div style={{ padding: '12px 16px' }}>
      {[1, 2].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className="skeleton skeleton-circle" style={{ width: 44, height: 44 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 200, height: 12, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: 60, height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <section className="reel reel-profile">
      <div className="reel-scroll">
        <div className="rp-top">
          <div className="skeleton skeleton-circle" style={{ width: 88, height: 88 }} />
          <div className="skeleton" style={{ width: 120, height: 18, marginTop: 16 }} />
          <div className="skeleton" style={{ width: 90, height: 12, marginTop: 8 }} />
        </div>
        <div className="rp-stats">
          <div className="skeleton" style={{ width: 48, height: 34 }} />
          <div className="skeleton" style={{ width: 48, height: 34 }} />
          <div className="skeleton" style={{ width: 48, height: 34 }} />
        </div>
      </div>
    </section>
  );
}
