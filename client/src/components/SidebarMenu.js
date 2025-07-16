import React from 'react';

const SidebarMenu = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { label: 'Carton Price', key: 'cartonPrice' },
    { label: 'Add Order', key: 'orders' },
    { label: 'Subscriptions', key: 'subscriptions' },
    { label: 'Pickup Sites', key: 'sites' },
    { label: 'Cycles', key: 'cycles' },
    { label: 'Download Orders', key: 'downloadOrders' },
    { label: 'Questions', key: 'questions' },
    { label: 'Mass Email', key: 'email' },
    { label: 'Notify Waitlist', key: 'waitlist' },
  ];

  return (
    <nav className="sidebar-menu">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={activeTab === tab.key ? 'active' : ''}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default SidebarMenu;
