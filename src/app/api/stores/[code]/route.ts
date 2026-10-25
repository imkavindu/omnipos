import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Store } from '@/models/Store';
import { User } from '@/models/User';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json({ error: 'Store code is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Case-insensitive exact match for store code
    const escapedCode = code.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const store = await Store.findOne({
      code: { $regex: new RegExp(`^${escapedCode}$`, 'i') },
      isActive: true,
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found — check your store code' },
        { status: 404 }
      );
    }

    // Retrieve staff members strictly belonging to this store branch (exclude SUPER_ADMIN and all credentials)
    const staff = await User.find({
      storeId: store._id.toString(),
      isActive: true,
      role: { $ne: 'SUPER_ADMIN' },
    })
      .select('-passwordHash -pinCode')
      .sort({ role: 1, name: 1 });

    return NextResponse.json({
      success: true,
      store,
      staff,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching store details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
