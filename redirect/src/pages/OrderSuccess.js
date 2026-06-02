// ════════════════════════════════════════════════════════════════════
// OrderSuccess.js
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { FaCheckCircle, FaDownload, FaBoxOpen } from 'react-icons/fa';

export const OrderSuccess = () => {
  const { id }   = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const orderNumber = location.state?.orderNumber || 'Your order';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <FaCheckCircle size={60} className="text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Order Confirmed! 🎉</h1>
        <p className="text-[var(--text-muted)] text-sm">
          <strong className="text-[var(--text-primary)]">{orderNumber}</strong> has been placed successfully.
          A confirmation email is on its way.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link
            to={`/order/${id}`}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm transition-colors"
          >
            <FaBoxOpen size={14} /> Track / View Order
          </Link>
          <Link
            to="/marketplace"
            className="py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;


// ════════════════════════════════════════════════════════════════════
// OrderDetail.js  — save as a separate file in pages/
// ════════════════════════════════════════════════════════════════════
// import React, { useState, useEffect, useContext } from 'react';
// import { useParams, Link }     from 'react-router-dom';
// import { AuthContext }         from '../context/AuthContext';
// import api                     from '../services/api';
// import { FaDownload, FaTruck } from 'react-icons/fa';
// import { BarLoader }           from 'react-spinners';

// const STATUS_STEPS = ['pending_payment','paid','processing','shipped','delivered','completed'];
// const STATUS_LABELS = {
//   pending_payment: 'Pending Payment',
//   paid:            'Paid',
//   processing:      'Processing',
//   shipped:         'Shipped',
//   delivered:       'Delivered',
//   completed:       'Completed',
//   failed:          'Failed',
//   refunded:        'Refunded',
// };

// const OrderDetail = () => {
//   const { id }  = useParams();
//   const { user }= useContext(AuthContext);
//   const [order, setOrder]   = useState(null);
//   const [loading,setLoading]= useState(true);
//   const [dlLoading,setDlLoading]=useState({});

//   useEffect(() => {
//     api.get(`/orders/${id}`)
//       .then(({ data }) => setOrder(data.order))
//       .finally(() => setLoading(false));
//   }, [id]);

//   const download = async (productId, fileName) => {
//     setDlLoading(d => ({ ...d, [productId]: true }));
//     try {
//       const { data } = await api.get(`/payments/orders/${id}/download/${productId}`);
//       window.open(data.url, '_blank');
//     } catch (err) {
//       alert(err.response?.data?.message || 'Download failed');
//     }
//     setDlLoading(d => ({ ...d, [productId]: false }));
//   };

//   if (loading) return <BarLoader width="100%" color="#7c3aed" />;
//   if (!order)  return <p className="p-8 text-center text-[var(--text-muted)]">Order not found.</p>;

//   const stepIdx    = STATUS_STEPS.indexOf(order.status);
//   const isBuyer    = order.buyerId?._id === user?._id || order.buyerId === user?._id;

//   return (
//     <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4">
//       <div className="max-w-3xl mx-auto space-y-6">
//         <div className="flex items-center justify-between">
//           <h1 className="text-xl font-bold text-[var(--text-primary)]">Order {order.orderNumber}</h1>
//           <span className={`px-3 py-1 rounded-full text-xs font-semibold
//             ${order.status === 'completed' ? 'bg-green-100 text-green-700' : ''}
//             ${order.status === 'shipped'   ? 'bg-blue-100 text-blue-700'  : ''}
//             ${order.status === 'paid'      ? 'bg-violet-100 text-violet-700' : ''}
//             ${order.status === 'failed'    ? 'bg-red-100 text-red-700'    : ''}
//           `}>{STATUS_LABELS[order.status] || order.status}</span>
//         </div>

//         {/* Progress bar */}
//         {!['failed','refunded','cancelled'].includes(order.status) && (
//           <div className="flex items-center gap-1">
//             {STATUS_STEPS.slice(1).map((s, i) => (
//               <React.Fragment key={s}>
//                 <div className={`flex-1 h-1.5 rounded-full ${i < stepIdx ? 'bg-violet-500' : 'bg-[var(--border-color)]'}`} />
//                 <div className={`w-3 h-3 rounded-full shrink-0 border-2 ${i < stepIdx ? 'bg-violet-500 border-violet-500' : 'bg-white border-[var(--border-color)]'}`} />
//               </React.Fragment>
//             ))}
//           </div>
//         )}

//         {/* Items */}
//         <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
//           <h2 className="font-bold text-[var(--text-primary)]">Items</h2>
//           {order.items.map(item => {
//             const dl = order.downloads?.find(d => d.productId?.toString() === item.productId?._id?.toString());
//             return (
//               <div key={item._id} className="flex gap-3 items-center">
//                 <img src={item.thumbnail || item.productId?.thumbnail || ''} alt="" className="w-12 h-12 rounded-xl object-cover bg-[var(--bg-secondary)]" />
//                 <div className="flex-1">
//                   <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
//                   <p className="text-xs text-[var(--text-muted)]">₹{item.price?.toLocaleString('en-IN')} × {item.qty}</p>
//                 </div>
//                 {isBuyer && item.type === 'digital' && ['paid','completed'].includes(order.status) && (
//                   <button
//                     onClick={() => download(item.productId?._id || item.productId, item.title)}
//                     disabled={dlLoading[item.productId?._id]}
//                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors disabled:opacity-60"
//                   >
//                     <FaDownload size={10} />
//                     {dlLoading[item.productId?._id] ? 'Loading…' : `Download (${dl?.count || 0}/${item.productId?.digital?.maxDownloads || 5})`}
//                   </button>
//                 )}
//               </div>
//             );
//           })}
//         </div>

//         {/* Shipping */}
//         {order.shipping?.trackingNumber && (
//           <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
//             <h2 className="font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
//               <FaTruck className="text-violet-500" /> Shipping
//             </h2>
//             <p className="text-sm text-[var(--text-secondary)]">Courier: <strong>{order.shipping.courier}</strong></p>
//             <p className="text-sm text-[var(--text-secondary)]">Tracking: <strong>{order.shipping.trackingNumber}</strong></p>
//             {order.shipping.shippedAt && (
//               <p className="text-xs text-[var(--text-muted)] mt-1">Shipped on {new Date(order.shipping.shippedAt).toLocaleDateString()}</p>
//             )}
//           </div>
//         )}

//         {/* Price breakdown */}
//         <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
//           <h2 className="font-bold text-[var(--text-primary)] mb-3">Payment Summary</h2>
//           <div className="space-y-1.5 text-sm">
//             <div className="flex justify-between text-[var(--text-secondary)]"><span>Subtotal</span><span>₹{(order.total + order.couponDiscount - order.shippingFee).toLocaleString('en-IN')}</span></div>
//             {order.couponDiscount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({order.couponCode})</span><span>-₹{order.couponDiscount.toLocaleString('en-IN')}</span></div>}
//             {order.shippingFee > 0  && <div className="flex justify-between text-[var(--text-secondary)]"><span>Shipping</span><span>₹{order.shippingFee.toLocaleString('en-IN')}</span></div>}
//             <div className="flex justify-between font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-color)]"><span>Total Paid</span><span>₹{order.total.toLocaleString('en-IN')}</span></div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OrderDetail;
// NOTE: Uncomment the full component above and save as pages/OrderDetail.js
