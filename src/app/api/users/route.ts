import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/db';
import { User, IUser } from '@/models/User';
import { signAuthToken, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');

    const filter: Record<string, unknown> = { isActive: true };
    if (storeId && storeId !== 'ALL') {
      filter.storeId = storeId;
    }

    // Exclude passwordHash and pinCode from being sent to client
    const users = await User.find(filter)
      .select('-passwordHash -pinCode')
      .sort({ role: 1, name: 1 });

    return NextResponse.json(users);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching users';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    // 1. Staff Creation Action (Store Manager provisioning new Cashier, Chef, Kiosk, or Branch Manager)
    if (body.action === 'create' || (body.name && body.email && body.role && body.pinCode && body.storeId)) {
      const { name, email, pinCode, role, storeId } = body;

      if (!name || !email || !pinCode || !role || !storeId) {
        return NextResponse.json(
          { error: 'Missing required staff fields: name, email, pinCode, role, storeId' },
          { status: 400 }
        );
      }

      if (role === 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Super Admin accounts cannot be provisioned via store staff administration' },
          { status: 403 }
        );
      }

      // Check if email already exists
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return NextResponse.json(
          { error: `User with email ${email} already exists` },
          { status: 400 }
        );
      }

      // Check if PIN is already taken within this store using bcrypt
      const storeStaff = await User.find({ storeId, isActive: true });
      for (const member of storeStaff) {
        if (member.pinCode && (await bcrypt.compare(pinCode.trim(), member.pinCode))) {
          return NextResponse.json(
            { error: `PIN ${pinCode} is already assigned to ${member.name} in this store` },
            { status: 400 }
          );
        }
      }

      // Hash staff PIN with bcrypt (cost factor: 10)
      const hashedPin = await bcrypt.hash(pinCode.trim(), 10);

      const newUser = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        pinCode: hashedPin,
        role,
        storeId,
        isActive: true,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Staff member created successfully',
          user: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            storeId: newUser.storeId,
          },
        },
        { status: 201 }
      );
    }

    // 2. Store Staff PIN Authentication Login Action
    const { pinCode, storeId } = body;

    if (!pinCode) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({ error: 'Active store branch is required for staff terminal authentication' }, { status: 400 });
    }

    // Find all active staff for this store (strictly excluding SUPER_ADMIN)
    const storeStaff = await User.find({
      storeId,
      isActive: true,
      role: { $ne: 'SUPER_ADMIN' },
    });

    let matchedUser: IUser | null = null;
    for (const member of storeStaff) {
      if (member.pinCode && (await bcrypt.compare(pinCode.trim(), member.pinCode))) {
        matchedUser = member;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ error: 'Invalid PIN or unauthorized for this store branch' }, { status: 401 });
    }

    // Generate signed JWT token for the authenticated staff session
    const token = signAuthToken({
      userId: matchedUser._id.toString(),
      email: matchedUser.email,
      name: matchedUser.name,
      role: matchedUser.role,
      storeId: matchedUser.storeId,
      avatar: matchedUser.avatar,
      mustChangePin: matchedUser.mustChangePin || false,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: matchedUser._id.toString(),
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        storeId: matchedUser.storeId,
        avatar: matchedUser.avatar,
        mustChangePin: matchedUser.mustChangePin || false,
      },
    });

    // Set secure httpOnly cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      ...AUTH_COOKIE_OPTIONS,
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error processing user request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { id, name, pinCode, role, isActive, mustChangePin } = body;

    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (role && role !== 'SUPER_ADMIN') updates.role = role;
    if (typeof isActive === 'boolean') updates.isActive = isActive;
    if (typeof mustChangePin === 'boolean') updates.mustChangePin = mustChangePin;

    if (pinCode) {
      updates.pinCode = await bcrypt.hash(pinCode.trim(), 10);
      if (mustChangePin === undefined) {
        updates.mustChangePin = false; // setting new PIN clears the mustChangePin flag
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select('-passwordHash -pinCode');
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Refresh JWT session cookie with updated mustChangePin status
    const token = signAuthToken({
      userId: updatedUser._id.toString(),
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      storeId: updatedUser.storeId,
      avatar: updatedUser.avatar,
      mustChangePin: updatedUser.mustChangePin || false,
    });

    const res = NextResponse.json({ success: true, user: updatedUser });
    res.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      ...AUTH_COOKIE_OPTIONS,
    });

    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating staff member';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
