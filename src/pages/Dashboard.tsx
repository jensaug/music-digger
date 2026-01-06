import React from 'react';
import '../styles/design-system.css';

const Dashboard: React.FC = () => {
    return (
        <div>
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1>Welcome back, Music Digger</h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>
                    Your music taste analysis dashboard.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)' }}>
                <div className="card">
                    <h3 style={{ color: 'var(--color-accent)' }}>Last Analysis</h3>
                    <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold' }}>--</p>
                    <p style={{ color: 'var(--color-text-muted)' }}>No data analyzed yet.</p>
                </div>

                <div className="card">
                    <h3>Top Genre</h3>
                    <p style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'bold' }}>--</p>
                    <p style={{ color: 'var(--color-text-muted)' }}>Analyze to discover.</p>
                </div>

                <div className="card" style={{ background: 'var(--gradient-primary)', borderColor: 'transparent' }}>
                    <h3 style={{ color: 'white' }}>Start New Analysis</h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                        Deep dive into your listening history from Last.fm and Tidal.
                    </p>
                    <button className="btn" style={{
                        backgroundColor: 'white',
                        color: 'var(--color-accent)',
                        marginTop: 'var(--space-4)',
                        fontWeight: 'bold'
                    }}>
                        Analyze Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
