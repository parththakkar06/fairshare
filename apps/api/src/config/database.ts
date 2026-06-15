import mongoose from 'mongoose';

export async function connectToDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri);
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}
