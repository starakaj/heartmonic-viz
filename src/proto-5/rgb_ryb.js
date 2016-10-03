/**************************************************************************************************
 *  Color Space - A RGB to RYB converter.
 *  
 *  Copyright (C) 2013 Joshua Gentry
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, either version 3 of the
 *  License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
	
/**********************************************************************************************
 * Construct a new object.
 * 
 * @param iRed    The initial red value.
 * @param iGreen  The initial green value.
 * @param iBlue   The initial blue value.
 */
RgbRyb = function(iRed, iGreen, iBlue)
{

	//-----------------------------------------------------------------------------------------
	// Save the RGB.
	this.setRgb(iRed, iGreen, iBlue);
}

/**********************************************************************************************
 * Given a RGB color, calculate the RYB color.  This code was taken from:
 * 
 * @param iRed    The current red value.
 * @param iGreen  The current green value.
 * @param iBlue   The current blue value.
 * 
 * http://www.insanit.net/tag/rgb-to-ryb/
 * 
 * Author: Arah J. Leonard
 * Copyright 01AUG09
 * Distributed under the LGPL - http://www.gnu.org/copyleft/lesser.html
 * ALSO distributed under the The MIT License from the Open Source Initiative (OSI) - 
 * http://www.opensource.org/licenses/mit-license.php
 * You may use EITHER of these licenses to work with / distribute this source code.
 * Enjoy!
 */
RgbRyb.prototype.setRgb = function(iRed, iGreen, iBlue)
{

	//-----------------------------------------------------------------------------------------
	// Save the RGB
	this.pRgb = [iRed, iGreen, iBlue];

	// Remove the white from the color
	var iWhite = Math.min(iRed, iGreen, iBlue);
	
	iRed   -= iWhite;
	iGreen -= iWhite;
	iBlue  -= iWhite;
	
	var iMaxGreen = Math.max(iRed, iGreen, iBlue);
	
	// Get the yellow out of the red+green
	
	var iYellow = Math.min(iRed, iGreen);
	
	iRed   -= iYellow;
	iGreen -= iYellow;
	
	// If this unfortunate conversion combines blue and green, then cut each in half to
	// preserve the value's maximum range.
	if (iBlue > 0 && iGreen > 0)
	{
		iBlue  /= 2;
		iGreen /= 2;
	}
	
	// Redistribute the remaining green.
	iYellow += iGreen;
	iBlue   += iGreen;
	
	// Normalize to values.
	var iMaxYellow = Math.max(iRed, iYellow, iBlue);
	
	if (iMaxYellow > 0)
	{
		var iN = iMaxGreen / iMaxYellow;
		
		iRed    *= iN;
		iYellow *= iN;
		iBlue   *= iN;
	}
	
	// Add the white back in.
	iRed    += iWhite;
	iYellow += iWhite;
	iBlue   += iWhite;
	
	this.pRyb = [Math.floor(iRed), Math.floor(iYellow), Math.floor(iBlue)];
}
	
/**********************************************************************************************
 * Given a RYB color, calculate the RGB color.  This code was taken from:
 * 
 * @param iRed     The current red value.
 * @param iYellow  The current yellow value.
 * @param iBlue    The current blue value.
 * 
 * http://www.insanit.net/tag/rgb-to-ryb/
 * 
 * Author: Arah J. Leonard
 * Copyright 01AUG09
 * Distributed under the LGPL - http://www.gnu.org/copyleft/lesser.html
 * ALSO distributed under the The MIT License from the Open Source Initiative (OSI) - 
 * http://www.opensource.org/licenses/mit-license.php
 * You may use EITHER of these licenses to work with / distribute this source code.
 * Enjoy!
 */
RgbRyb.prototype.setRyb = function(iRed, iYellow, iBlue)
{

	//-----------------------------------------------------------------------------------------
	// Save the RYB
	this.pRyb = [iRed, iYellow, iBlue];
	
	// Remove the whiteness from the color.
	var iWhite = Math.min(iRed, iYellow, iBlue);
	
	iRed    -= iWhite;
	iYellow -= iWhite;
	iBlue   -= iWhite;

	var iMaxYellow = Math.max(iRed, iYellow, iBlue);

	// Get the green out of the yellow and blue
	var iGreen = Math.min(iYellow, iBlue);
	
	iYellow -= iGreen;
	iBlue   -= iGreen;

	if (iBlue > 0 && iGreen > 0)
	{
		iBlue  *= 2.0;
		iGreen *= 2.0;
	}
	
	// Redistribute the remaining yellow.
	iRed   += iYellow;
	iGreen += iYellow;

	// Normalize to values.
	var iMaxGreen = Math.max(iRed, iGreen, iBlue);
	
	if (iMaxGreen > 0)
	{
		var iN = iMaxYellow / iMaxGreen;
		
		iRed   *= iN;
		iGreen *= iN;
		iBlue  *= iN;
	}
	
	// Add the white back in.
	iRed   += iWhite;
	iGreen += iWhite;
	iBlue  += iWhite;

	// Save the RGB
	this.pRgb = [Math.floor(iRed), Math.floor(iGreen), Math.floor(iBlue)];
}

/**********************************************************************************************
 * Returns the hex code for three digits in an array.
 * 
 * @param aData  An array of three integers to return the hex code for. 
 *  
 * @returns  The hex code for the three numbers
 */
RgbRyb.prototype.getHexCode = function(aData)
{
	
	//-----------------------------------------------------------------------------------------
	// Create the hex code for the array.
	var szColor = "";
	var szOne   = aData[0].toString(16);
	var szTwo   = aData[1].toString(16);
	var szThr   = aData[2].toString(16);
	
	if (szOne.length == 1) szColor += "0" + szOne; else szColor += szOne;
	if (szTwo.length == 1) szColor += "0" + szTwo; else szColor += szTwo;
	if (szThr.length == 1) szColor += "0" + szThr; else szColor += szThr;
	
	return(szColor);
}

/**********************************************************************************************
 * Calculate the luminance of the color.
 * 
 * @returns The luminance of the color in the range 0 to 255.
 */
RgbRyb.prototype.getLuminance = function()
{
	return(Math.floor(0.2126 * this.pRgb[0] + 0.7152 * this.pRgb[1] + 0.0722 * this.pRgb[2]));
}

/**********************************************************************************************
 * Return the RGB color in #RRGGBB format.
 * 
 * @returns The RGB color in #RRGGBB.
 */
RgbRyb.prototype.getRgbText = function()
{
	return("#" + this.getHexCode(this.pRgb));
}

/**********************************************************************************************
 * Return the RYB color in #RRYYBB format.
 * 
 * @returns The RYB color in #RRYYBB.
 */
RgbRyb.prototype.getRybText = function()
{
	return("#" + this.getHexCode(this.pRyb));
}

/**********************************************************************************************
 * Returns the red component of the RGB value.
 * 
 * @return  The red color 0 - 255.
 */
RgbRyb.prototype.getRgbRed = function()
{
	return(this.pRgb[0]);
}

/**********************************************************************************************
 * Returns the green component of the RGB value.
 * 
 * @return  The green color 0 - 255.
 */
RgbRyb.prototype.getRgbGreen = function()
{
	return(this.pRgb[1]);
}

/**********************************************************************************************
 * Returns the blue component of the RGB value.
 * 
 * @return  The blue color 0 - 255.
 */
RgbRyb.prototype.getRgbBlue = function()
{
	return(this.pRgb[2]);
}

/**********************************************************************************************
 * Returns the red component of the RYB value.
 * 
 * @return  The red color 0 - 255.
 */
RgbRyb.prototype.getRybRed = function()
{
	return(this.pRyb[0]);
}

/**********************************************************************************************
 * Returns the yellow component of the RYB value.
 * 
 * @return  The yellow color 0 - 255.
 */
RgbRyb.prototype.getRybYellow = function()
{
	return(this.pRyb[1]);
}

/**********************************************************************************************
 * Returns the blue component of the RYB value.
 * 
 * @return  The blue color 0 - 255.
 */
RgbRyb.prototype.getRybBlue = function()
{
	return(this.pRyb[2]);
}
