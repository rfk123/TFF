import React from 'react';
import { useEffect, useState } from 'react';
import SidebarMenu from '../components/SidebarMenu';
import CartonPriceManager from '../components/Admin/CartonPriceManager';
import ManualSubscriptionForm from '../components/Admin/ManualSubscriptionForm';
import NotifyWaitlist from '../components/Admin/NotifyWaitlist';
import MassEmailSender from '../components/Admin/MassEmailSender';
import CycleManager from '../components/Admin/CycleManager';
import PickupSiteManager from '../components/Admin/PickupSiteManager';
import QuestionsTable from '../components/Admin/QuestionsTable';
import SubscriptionsTable from '../components/Admin/SubscriptionsTable';
import DownloadOrders from '../components/Admin/DownloadOrders';
import './admin.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('subscriptions');

  const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

    useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
  };

  const isMobile = useIsMobile();
  const tabs = [
    { label: 'Subscriptions', key: 'subscriptions' },
    { label: 'Download Orders', key: 'downloadOrders' },
    { label: 'Add Order', key: 'orders' },
    { label: 'Mass Email', key: 'email' },
    { label: 'Notify Waitlist', key: 'waitlist' },
    { label: 'Cycles', key: 'cycles' },
    { label: 'Pickup Sites', key: 'sites' },
    { label: 'Questions', key: 'questions' },
    { label: 'Carton Price', key: 'cartonPrice' },
  ];

  return (
    <div className="admin-container">
      {isMobile ? (
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="admin-dropdown"
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label}
            </option>
          ))}
        </select>
      ) : (
        <SidebarMenu activeTab={activeTab} setActiveTab={setActiveTab} />
      )}

      <main className="admin-content">
        {activeTab === 'subscriptions' && <SubscriptionsTable />}
        {activeTab === 'downloadOrders' && <DownloadOrders />}
        {activeTab === 'orders' && <ManualSubscriptionForm />}
        {activeTab === 'email' && <MassEmailSender />}
        {activeTab === 'waitlist' && <NotifyWaitlist />}
        {activeTab === 'cycles' && <CycleManager />}
        {activeTab === 'sites' && <PickupSiteManager />}
        {activeTab === 'questions' && <QuestionsTable />}
        {activeTab === 'cartonPrice' && <CartonPriceManager />}
      </main>
    </div>
  );
};

export default AdminDashboard;
