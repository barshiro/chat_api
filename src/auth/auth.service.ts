import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<any>,
    private jwtService: JwtService,
  ) {}
  

  async register(dto: RegisterDto) {
    const { email, password, username, displayName, birthDate, publicKey } = dto;
    const existing = await this.userModel.findOne({ 'private.email': email }).exec();
    if (existing) throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);

    const existingUsername = await this.userModel.findOne({ 'public.username': username }).exec();
    if (existingUsername) throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      Keys_storage: { public_key: publicKey },
      public: {
        username,
        displayName,
        birthDate,
        status: 'offline',
      },
      private: {
        email,
        passwordHash,
      },
    });
    await user.save();

    const payload = { sub: user._id };
    const token = this.jwtService.sign(payload);
    return { token, user: { _id: user._id, public: user.public } };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.userModel.findOne({ 'private.email': email }).exec();
    if (!user) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);

    const isMatch = await bcrypt.compare(password, user.private.passwordHash);
    if (!isMatch) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);

    const payload = { sub: user._id };
    const token = this.jwtService.sign(payload);
    return { token, user: { _id: user._id, public: user.public } };
  }
}