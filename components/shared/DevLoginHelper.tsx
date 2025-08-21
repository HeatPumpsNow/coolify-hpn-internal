// Development Login Helper Component
// Only shows in development environment with auto-fill buttons

import React from 'react';

interface DevLoginHelperProps {
  onFillLogin?: (email: string, password: string) => void;
  loginType?: 'owner' | 'employee' | 'customer' | 'general';
}

const DevLoginHelper: React.FC<DevLoginHelperProps> = ({ onFillLogin, loginType = 'general' }) => {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const loginOptions = {
    owner: [
      { label: '👔 Demo Owner', email: 'owner@heatpumpsnow.com', password: 'demo123' },
    ],
    employee: [
      { label: '🔧 Lead Technician', email: 'alex.thompson@heatpumpsnow.com', password: 'demo123' },
      { label: '💼 Sales Rep', email: 'ryan.clark@heatpumpsnow.com', password: 'demo123' },
    ],
    customer: [
      { label: '🏠 Residential Customer', email: 'john.smith@email.com', password: 'demo123' },
      { label: '🏢 Commercial Customer', email: 'admin@springfieldoffice.com', password: 'demo123' },
    ],
    general: [
      { label: '👔 Demo Owner', email: 'owner@heatpumpsnow.com', password: 'demo123' },
      { label: '🔧 Technician', email: 'alex.thompson@heatpumpsnow.com', password: 'demo123' },
      { label: '🏠 Customer', email: 'john.smith@email.com', password: 'demo123' },
    ],
  };

  const options = loginOptions[loginType];

  const handleAutoFill = (email: string, password: string) => {
    // Method 1: Try to find and fill form inputs directly
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="Email" i]',
      'input[id*="email" i]',
      'input[id*="username" i]'
    ];
    
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="Password" i]',
      'input[id*="password" i]'
    ];

    let emailInput: HTMLInputElement | null = null;
    let passwordInput: HTMLInputElement | null = null;

    // Find email input
    for (const selector of emailSelectors) {
      emailInput = document.querySelector(selector) as HTMLInputElement;
      if (emailInput) break;
    }

    // Find password input
    for (const selector of passwordSelectors) {
      passwordInput = document.querySelector(selector) as HTMLInputElement;
      if (passwordInput) break;
    }

    // Fill and trigger events for React forms
    if (emailInput) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(emailInput, email);
      } else {
        emailInput.value = email;
      }
      
      // Trigger multiple events to ensure React picks it up
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    if (passwordInput) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(passwordInput, password);
      } else {
        passwordInput.value = password;
      }
      
      // Trigger multiple events to ensure React picks it up
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // Method 2: Call the callback if provided (for manual handling)
    if (onFillLogin) {
      onFillLogin(email, password);
    }

    // Method 3: Focus the submit button to make it obvious the form is filled
    setTimeout(() => {
      const submitButton = document.querySelector('button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign In")') as HTMLElement;
      if (submitButton) {
        submitButton.focus();
        submitButton.style.background = '#4CAF50';
        submitButton.style.transform = 'scale(1.05)';
        setTimeout(() => {
          submitButton.style.background = '';
          submitButton.style.transform = '';
        }, 1000);
      }
    }, 100);

    console.log('🧪 Dev Helper: Filled login form', { email, password, emailInput: !!emailInput, passwordInput: !!passwordInput });
  };

  return (
    <div className="dev-login-helper" style={{
      background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%)',
      border: '2px dashed #4a90e2',
      borderRadius: '12px',
      padding: '16px',
      margin: '16px 0',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(74, 144, 226, 0.1)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ 
        fontSize: '14px', 
        color: '#666', 
        marginBottom: '12px', 
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}>
        🧪 <span>Development Mode - Quick Login</span>
      </div>
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        flexWrap: 'wrap', 
        justifyContent: 'center' 
      }}>
        {options.map((option, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleAutoFill(option.email, option.password)}
            style={{
              background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(74, 144, 226, 0.2)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(74, 144, 226, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(74, 144, 226, 0.2)';
            }}
            title={`Click to fill: ${option.email} / ${option.password}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div style={{ 
        fontSize: '11px', 
        color: '#888', 
        marginTop: '8px',
        opacity: 0.8
      }}>
        💡 All demo passwords: <code style={{background: '#e9ecef', padding: '2px 4px', borderRadius: '3px'}}>demo123</code>
      </div>
    </div>
  );
};

export default DevLoginHelper;