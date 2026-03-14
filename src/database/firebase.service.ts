// import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
// import * as admin from 'firebase-admin';
// import { FIREBASE_CONNECTION } from '../firebase/firebase.module';

// @Injectable()
// export class FirebaseService implements OnModuleInit {
//   private firestore!: admin.firestore.Firestore;

//   constructor(
//     @Inject(FIREBASE_CONNECTION) private readonly firebaseApp: admin.app.App,
//   ) {}

//   onModuleInit() {
//     this.firestore = this.firebaseApp.firestore();
//   }

//   getFirestore(): admin.firestore.Firestore {
//     return this.firestore;
//   }

//   // Helper methods
//   async getDocument(collection: string, docId: string) {
//     const doc = await this.firestore.collection(collection).doc(docId).get();
//     return doc.exists ? { id: doc.id, ...doc.data() } : null;
//   }

//   async queryCollection(collection: string, field: string, value: any) {
//     const snapshot = await this.firestore
//       .collection(collection)
//       .where(field, '==', value)
//       .get();

//     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
//   }

//   async createDocument(collection: string, data: any, docId?: string) {
//     if (docId) {
//       await this.firestore.collection(collection).doc(docId).set(data);
//       return { id: docId, ...data };
//     } else {
//       const docRef = await this.firestore.collection(collection).add(data);
//       return { id: docRef.id, ...data };
//     }
//   }

//   async updateDocument(collection: string, docId: string, data: any) {
//     await this.firestore.collection(collection).doc(docId).update(data);
//     return { id: docId, ...data };
//   }

//   async deleteDocument(collection: string, docId: string) {
//     await this.firestore.collection(collection).doc(docId).delete();
//   }
// }
