import { MessageSquare, Zap, Crown, Rocket } from 'lucide-react';

export const packages = [
  {
    name: 'Free',
    icon: MessageSquare,
    price: '0 Ft',
    period: 'havonta',
    features: ['5 AI beszélgetés naponta', 'GPT-4 & Claude hozzáférés'],
    gradient: 'from-slate-600 to-slate-800',
    highlight: false
  },
 ,
     {
       name: 'Pro',
       icon: Zap,
       price: '4.990 Ft',
       period: 'havonta',
       features: [
         'Korlátlan AI beszélgetések',
         'Összes prémium AI modell',
         'Villámgyors válaszidő',
         'Prioritásos 24/7 support',
         'Fejlett analytics & insights',
         'Chat történet & export',
         'API hozzáférés',
         'Egyedi promptok mentése'
       ],
       gradient: 'from-purple-600 via-pink-600 to-orange-500',
       highlight: true
     },
     {
       name: 'Business',
       icon: Crown,
       price: '14.990 Ft',
       period: 'havonta',
       features: [
         'Minden Pro funkció',
         'Csapat workspace (max 10 fő)',
         'Egyedi AI finomhangolás',
         'Dedicated account manager',
         'SSO & Advanced security',
         'Fehér címkés megoldás',
         'Prioritásos új funkciók',
         'SLA garancia 99.9%'
       ],
       gradient: 'from-amber-500 via-yellow-500 to-amber-600',
       highlight: false
     },
     {
       name: 'Enterprise',
       icon: Rocket,
       price: 'Egyedi',
       period: 'ajánlat',
       features: [
         'Minden Business funkció',
         'Korlátlan felhasználók',
         'On-premise / private cloud',
         'Egyedi AI modellek',
         'Dedikált infrastruktúra',
         'Compliance & audit support',
         '24/7 VIP technical support',
         'Teljes testreszabhatóság'
       ],
       gradient: 'from-cyan-500 via-blue-600 to-indigo-700',
       highlight: false
     },
];
