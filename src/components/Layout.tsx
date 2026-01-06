import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Disc, Settings, Music } from 'lucide-react';
import '../styles/design-system.css';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '250px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                padding: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                zIndex: 10
            }}>
                <div style={{ marginBottom: 'var(--space-12)' }}>
                    <h1 style={{
                        fontSize: 'var(--font-size-xl)',
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0
                    }}>
                        Music Digger
                    </h1>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `btn ${isActive ? 'btn-primary' : 'btn-secondary'}`
                        }
                        style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', color: 'var(--color-text-secondary)' }}
                    >
                        {({ isActive }) => (
                            <>
                                <Home size={20} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
                                <span style={{ color: isActive ? 'var(--color-text-primary)' : 'inherit' }}>Dashboard</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink
                        to="/analyzer"
                        className={({ isActive }) =>
                            `btn ${isActive ? '' : ''}`
                        }
                        style={{
                            justifyContent: 'flex-start',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text-secondary)',
                            marginTop: 'var(--space-2)'
                        }}
                    >
                        {({ isActive }) => (
                            <>
                                <Disc size={20} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
                                <span style={{ color: isActive ? 'var(--color-text-primary)' : 'inherit' }}>Artist Analyzer</span>
                            </>
                        )}
                    </NavLink>

                    <NavLink
                        to="/playlist-analyzer"
                        className={({ isActive }) =>
                            `btn ${isActive ? '' : ''}`
                        }
                        style={{
                            justifyContent: 'flex-start',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--color-text-secondary)',
                            marginTop: 'var(--space-2)'
                        }}
                    >
                        {({ isActive }) => (
                            <>
                                <Music size={20} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
                                <span style={{ color: isActive ? 'var(--color-text-primary)' : 'inherit' }}>Playlist Analyzer</span>
                            </>
                        )}
                    </NavLink>
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <NavLink
                        to="/settings"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--color-text-secondary)',
                            padding: 'var(--space-2) var(--space-4)'
                        }}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </NavLink>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: '250px',
                padding: 'var(--space-8)',
                maxWidth: 'calc(100vw - 250px)'
            }}>
                <div className="container">
                    {children}
                </div>
            </main>
        </div >
    );
};

export default Layout;
