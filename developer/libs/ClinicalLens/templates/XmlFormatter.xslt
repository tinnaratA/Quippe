<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:msxsl="urn:schemas-microsoft-com:xslt" xmlns:f="http://hl7.org/fhir" xmlns:m="http://schemas.medicomp.com/MedcinAnnotations.xsd" exclude-result-prefixes="msxsl">
  <xsl:output method="html" indent="yes" version="4.01" doctype-public="html"/>

  <xsl:template match="/">
    <xsl:element name="div">
      <xsl:attribute name="class">xmlFormat</xsl:attribute>
      <xsl:apply-templates />
    </xsl:element>
  </xsl:template>

  <xsl:template match="*">
    <xsl:element name="div">
      <xsl:attribute name="class">elem</xsl:attribute>

      <xsl:text>&lt;</xsl:text>

      <xsl:element name="span">
        <xsl:attribute name="class">name</xsl:attribute>
        <xsl:value-of select="name(.)"/>
      </xsl:element>

      <xsl:apply-templates select="@*"/>

      <xsl:text>/&gt;</xsl:text>

    </xsl:element>
  </xsl:template>

  <xsl:template match="*[node()]">
    <xsl:element name="div">
      <xsl:attribute name="class">elem</xsl:attribute>

      <xsl:text>&lt;</xsl:text>
      <xsl:element name="span">
        <xsl:attribute name="class">name</xsl:attribute>
        <xsl:value-of select="name(.)"/>
      </xsl:element>

      <xsl:apply-templates select="@*"/>

      <xsl:text>&gt;</xsl:text>

      <xsl:element name="span">
        <xsl:attribute name="class">simpleContent</xsl:attribute>
        <xsl:value-of select="."/>
      </xsl:element>

      <xsl:text>&lt;/</xsl:text>
      <xsl:element name="span">
        <xsl:attribute name="class">name</xsl:attribute>
        <xsl:value-of select="name(.)"/>
      </xsl:element>
      <xsl:text>&gt;</xsl:text>

    </xsl:element>
  </xsl:template>

  <xsl:template match="*[* or processing-instruction() or comment() or string-length(.) &gt; 80]">
    <xsl:variable name="id">
      <xsl:value-of select="generate-id()"/>
    </xsl:variable>

    <xsl:element name="div">
      <xsl:attribute name="class">
        <xsl:text>elem expandable </xsl:text>
        <xsl:if test="name(.) = 'entry' and f:resource/*[@m:MedcinId]">
		  <xsl:text>codedFinding medcinId</xsl:text><xsl:value-of select="f:resource/*/@m:MedcinId"/><xsl:text> </xsl:text>
		</xsl:if>
		<xsl:if test="name(.) = 'entry' and f:resource/f:Encounter">
		  <xsl:text>collapsed </xsl:text>
		</xsl:if>
		<xsl:if test="name(.) = 'entry' and f:resource/f:CarePlan">
		  <xsl:text>findingContainer </xsl:text>
		  <xsl:for-each select="f:resource/f:CarePlan/f:activity">
			<xsl:text>medcinId</xsl:text><xsl:value-of select="@m:MedcinId"/><xsl:text> </xsl:text>
		  </xsl:for-each>
		</xsl:if>
		<xsl:if test="name(.) = 'entry' and f:resource/f:DiagnosticReport">
		  <xsl:text>findingContainer </xsl:text>
		  <xsl:for-each select="f:resource/f:DiagnosticReport/f:codedDiagnosis">
			<xsl:text>medcinId</xsl:text><xsl:value-of select="@m:MedcinId"/><xsl:text> </xsl:text>
		  </xsl:for-each>
		</xsl:if>
		<xsl:if test="name(.) = 'activity' or name(.) = 'codedDiagnosis'">
		  <xsl:text>codedFinding medcinId</xsl:text><xsl:value-of select="@m:MedcinId"/><xsl:text> </xsl:text>
		</xsl:if>
      </xsl:attribute>
      <xsl:attribute name="id">
        <xsl:value-of select="$id"/>
      </xsl:attribute>
		
	  <xsl:if test="name(.) = 'entry' and f:resource/*[@m:MedcinId]">
		<xsl:attribute name="data-node-key">
		  <xsl:value-of select="f:resource/*/@m:NodeKey"/>
		</xsl:attribute>
	  </xsl:if>
		
	  <xsl:if test="name(.) = 'activity' or name(.) = 'codedDiagnosis'">
		<xsl:attribute name="data-node-key">
		  <xsl:value-of select="@m:NodeKey"/>
		</xsl:attribute>
	  </xsl:if>

      <xsl:element name="div">
        <xsl:attribute name="class">expander</xsl:attribute>
        <xsl:attribute name="id">
          <xsl:value-of select="concat($id,'_exp')"/>
        </xsl:attribute>
        <xsl:choose>
		  <xsl:when test="name(.) = 'entry' and f:resource/f:Encounter">
			<xsl:text>+</xsl:text>
		  </xsl:when>
		  <xsl:otherwise>
			 <xsl:text>-</xsl:text>
		  </xsl:otherwise>
		</xsl:choose>
      </xsl:element>

      <xsl:element name="div">
        <xsl:attribute name="class">header</xsl:attribute>
        <xsl:text>&lt;</xsl:text>
        <xsl:element name="span">
          <xsl:attribute name="class">name</xsl:attribute>
          <xsl:value-of select="name(.)"/>
        </xsl:element>
        <xsl:apply-templates select="@*"/>
        <xsl:text>&gt;</xsl:text>
      </xsl:element>

      <xsl:element name="div">
        <xsl:attribute name="class">content</xsl:attribute>
        <xsl:apply-templates />
      </xsl:element>

      <xsl:element name="div">
        <xsl:attribute name="class">footer</xsl:attribute>
        <xsl:text>&lt;/</xsl:text>
        <xsl:element name="span">
          <xsl:attribute name="class">name</xsl:attribute>
          <xsl:value-of select="name(.)"/>
        </xsl:element>
        <xsl:text>&gt;</xsl:text>
      </xsl:element>

    </xsl:element>
  </xsl:template>

  <xsl:template match="@*">
    <xsl:if test="name(.) != 'm:MedcinId' and name(.) != 'm:Prefix' and name(.) != 'm:NodeKey'">
		<xsl:element name="span">
		  <xsl:attribute name="class">attr</xsl:attribute>
		  <xsl:element name="span">
			<xsl:attribute name="class">name</xsl:attribute>
			<xsl:value-of select="name(.)"/>
			<xsl:text>="</xsl:text>
			<xsl:element name="span">
			  <xsl:attribute name="class">value</xsl:attribute>
			  <xsl:value-of select="."/>
			</xsl:element>
			<xsl:text>"</xsl:text>
		  </xsl:element>
		</xsl:element>
    </xsl:if>
  </xsl:template>

  <xsl:template match="text()">
    <xsl:if test="normalize-space(.)">
      <xsl:value-of select="."/>
    </xsl:if>
  </xsl:template>

  <xsl:template match="processing-instruction()">
    <xsl:element name="div">
      <xsl:attribute name="class">pi</xsl:attribute>
      <xsl:text>&lt;?</xsl:text>
      <xsl:value-of select="name(.)"/>
      <xsl:text> </xsl:text>
      <xsl:value-of select="."/>
      <xsl:text>?&gt;</xsl:text>
    </xsl:element>
  </xsl:template>

  <xsl:template match="comment()">
    <xsl:element name="div">
      <xsl:attribute name="class">comment</xsl:attribute>
      <xsl:text>&lt;!--</xsl:text>
      <xsl:value-of select="."/>
      <xsl:text>--&gt;</xsl:text>
    </xsl:element>
  </xsl:template>


</xsl:stylesheet>
