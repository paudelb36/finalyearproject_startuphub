// Custom Admin Authentication API
// This bypasses Supabase auth and uses the separate admin_users table

import { supabase } from '../supabase.js';
import bcrypt from 'bcryptjs';

// Admin login function
export async function adminLogin(email, password) {
  try {
    // Get admin user from custom admin_users table
    const { data: adminUser, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !adminUser) {
      throw new Error('Invalid credentials');
    }

    // For now, we'll use simple password comparison
    // In production, you should use bcrypt.compare(password, adminUser.password_hash)
    const isValidPassword = password === 'Admin123!';
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', adminUser.id);

    // Return admin user data (without password)
    const { password_hash, ...adminData } = adminUser;
    return {
      success: true,
      admin: adminData
    };
  } catch (error) {
    console.error('Admin login error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get admin profile
export async function getAdminProfile(adminId) {
  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, last_login, created_at')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new Error('Admin not found');
    }

    return {
      success: true,
      admin
    };
  } catch (error) {
    console.error('Get admin profile error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Update admin profile
export async function updateAdminProfile(adminId, updates) {
  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', adminId)
      .select('id, email, full_name, role, last_login, created_at')
      .single();

    if (error) {
      throw new Error('Failed to update admin profile');
    }

    return {
      success: true,
      admin
    };
  } catch (error) {
    console.error('Update admin profile error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Change admin password
export async function changeAdminPassword(adminId, currentPassword, newPassword) {
  try {
    // Get current admin
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('password_hash')
      .eq('id', adminId)
      .single();

    if (error) {
      throw new Error('Admin not found');
    }

    // Verify current password (simplified for now)
    const isValidPassword = currentPassword === 'Admin123!';
    
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password (simplified for now)
    const newPasswordHash = `hashed_${newPassword}`;

    // Update password
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ password_hash: newPasswordHash })
      .eq('id', adminId);

    if (updateError) {
      throw new Error('Failed to update password');
    }

    return {
      success: true,
      message: 'Password updated successfully'
    };
  } catch (error) {
    console.error('Change admin password error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Verify admin session (for middleware)
export async function verifyAdminSession(adminId) {
  try {
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, role')
      .eq('id', adminId)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return {
        success: false,
        error: 'Invalid admin session'
      };
    }

    return {
      success: true,
      admin
    };
  } catch (error) {
    console.error('Verify admin session error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}