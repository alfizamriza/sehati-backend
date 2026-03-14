// import { Module, Global } from '@nestjs/common';
// import * as admin from 'firebase-admin';
// import { ConfigModule, ConfigService } from '@nestjs/config';

// // Token untuk injection nanti
// export const FIREBASE_CONNECTION = 'FIREBASE_CONNECTION';

// @Global()
// @Module({
//   imports: [ConfigModule],
//   providers: [
//     {
//       provide: FIREBASE_CONNECTION,
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => {
//         if (admin.apps.length === 0) {
//           admin.initializeApp({
//             credential: admin.credential.cert({
//               projectId: configService.get('FIREBASE_PROJECT_ID'),
//               clientEmail: configService.get('FIREBASE_CLIENT_EMAIL'),
//               privateKey: configService.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
//             }),
//           });
//         }
        
//         // 🔥 TAMBAHKAN INI: Agar Firestore mengabaikan field yang undefined
//         const firestore = admin.firestore();
//         firestore.settings({ ignoreUndefinedProperties: true });

//         return admin.app();
//       },
//     },
//   ],
//   exports: [FIREBASE_CONNECTION],
// })
// export class FirebaseModule {}