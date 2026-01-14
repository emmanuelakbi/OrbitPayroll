/**
 * Lighthouse CI Configuration
 * 
 * Targets WCAG 2.1 AA compliance and performance benchmarks
 * per OrbitPayroll non-functional requirements.
 */
module.exports = {
  ci: {
    collect: {
      // Run against local build
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Ready',
      startServerReadyTimeout: 30000,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/auth',
      ],
      numberOfRuns: 3,
      settings: {
        // Simulate 4G connection per Requirement 1.1
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
    },
    assert: {
      assertions: {
        // Performance: Dashboard should load in < 2 seconds (Requirement 1.1)
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'interactive': ['warn', { maxNumericValue: 3000 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        
        // Accessibility: WCAG 2.1 AA compliance (Requirement 7.1)
        'categories:accessibility': ['error', { minScore: 0.9 }],
        
        // Best practices
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        
        // SEO basics
        'categories:seo': ['warn', { minScore: 0.8 }],
        
        // Specific accessibility checks (Requirements 7.2-7.7)
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        'button-name': 'error',
        'link-name': 'error',
        'image-alt': 'error',
        'label': 'error',
        'tabindex': 'warn',
        'focus-traps': 'error',
        'focusable-controls': 'warn',
        'interactive-element-affordance': 'warn',
        'logical-tab-order': 'warn',
        'managed-focus': 'warn',
      },
    },
    upload: {
      // Store results locally
      target: 'filesystem',
      outputDir: './lighthouse-reports',
    },
  },
};
